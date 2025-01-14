<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Class for loading/storing note from the DB.
 *
 * @package    local_notebook
 * @copyright  2021 Université de Montréal
 * @author     Issam Taboubi <issam.taboubi@umontreal.ca>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
namespace local_notebook;

use stdClass;
use coding_exception;
use moodle_exception;
use context_course;
use context_system;
use core_course_category;
use \local_notebook\local_notebook_posts;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/filelib.php');

/**
 * Class for notebook api.
 *
 * @package    local_notebook
 * @copyright  2021 Université de Montréal
 * @author     Issam Taboubi <issam.taboubi@umontreal.ca>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class api {

    /**
     * Add a note.
     *
     * @param string $note A note.
     * @param string $subject A subject for the note.
     * @param int $userid The user ID.
     * @param int $courseid The course ID.
     * @param int $coursemoduleid The course module ID.
     * @param int $itemid Item id coming from draft editor (form hidden element).
     * @return int the note id.
     */
    public static function add_note($note, $subject, $userid, $courseid, $coursemoduleid, $itemid = 0) {
        global $USER, $DB;
        self::can_use_notebook();
        if ($courseid) {
            $context = context_course::instance($courseid);
        } else {
            $context = context_system::instance();
        }
        // EDITOR_UNLIMITED_FILES is defined as -1, for some reason external passes constant as string in array below.
        $definitionoptions = [
            'maxfiles' => -1,
            'trusttext' => true,
            'subdirs' => true,
            'noclean' => false,
            'context' => $context
        ];
        // Init note persistence.
        $notebook = new local_notebook_posts();
        if ($courseid) {
            $course = $DB->get_record('course', ['id' => $courseid], '*', MUST_EXIST);
            if (!core_course_category::can_view_course_info($course)) {
                throw new \moodle_exception('usercannotaccesscourse', 'local_notebook');
            }
            $notebook->set('courseid', $course->id);
            $notebook->set('coursename', $course->shortname);
        }

        if ($userid) {
            $user = $DB->get_record('user', ['id' => $userid], '*', MUST_EXIST);
            if ($courseid) {
                if (!is_enrolled($context, $user, '', true)) {
                    throw new \moodle_exception('usernotenrolledincourse', 'local_notebook');
                }
            }
            // Ignore the coursemodule.
            $coursemoduleid = 0;
            $notebook->set('userid', $userid);
        }

        if ($coursemoduleid) {
            $cm = get_coursemodule_from_id('', $coursemoduleid, 0, true, MUST_EXIST);
            $modinfo = get_fast_modinfo($cm->course);
            $cm = $modinfo->instances[$cm->modname][$cm->instance];
            if (!$cm->uservisible) {
                throw new \moodle_exception('usercannotaccesscoursemodule', 'local_notebook');
            }
            if ($cm->course != $courseid) {
                throw new \moodle_exception('coursedifferentfromcmcourse', 'local_notebook');
            }
            $coursemoduleid = $cm->id;
            $notebook->set('coursemoduleid', $coursemoduleid);
            $notebook->set('activityname', $cm->name);
        }

        if (trim((string)$note) == '') {
            throw new \moodle_exception('notecannotbeempty', 'local_notebook');
        }

        if (trim((string)$subject) == '') {
            throw new \moodle_exception('subjectcannotbeempty', 'local_notebook');
        }
        $note = (object) [
            'summary_editor' => [
                'text' => $note,
                'format' => FORMAT_HTML,
                'itemid' => $itemid,
            ],
        ];
        $note = file_postupdate_standard_editor($note, 'summary', $definitionoptions, $context, 'local_notebook', 'summary',
            $itemid);
        $notebook->set('subject', $subject);
        $notebook->set('summary', $note->summary);
        $notebook->set('summaryformat', $note->summaryformat);
        $notebook->set('itemid', $itemid);
        $success = $notebook->create();
        if ($success) {
            $event = \local_notebook\event\notebook_created::create([
                'objectid' => $notebook->get('id'),
                // Set to null, so teacher can not access to the student note.
                'courseid' => null,
                'relateduserid' => $notebook->get('userid'),
                'userid' => $notebook->get('usermodified'),
                'context' => $context,
                'other' => ['courseid' => $notebook->get('courseid'), 'cmid' => $notebook->get('coursemoduleid')],
            ]);
            $event->trigger();
        }
        return $notebook->get('id');
    }
    /**
     * Read note.
     *
     * @param local_notebook_posts|int $noteorid The note object or the note id
     * @return local_notebook_posts
     */
    public static function read_note($noteorid) {
        global $USER;
        // Check if user can use notebook.
        self::can_use_notebook();
        $note = $noteorid;
        if (!is_object($note)) {
            $note = new local_notebook_posts($noteorid);
        }

        if ($USER->id != $note->get('usermodified')) {
            throw new \moodle_exception('usercannotreadnote', 'local_notebook');
        }
        return $note;
    }

    /**
     * Log the note viewed event.
     *
     * @param local_notebook_posts|int $noteorid The note object or note id
     * @return bool
     */
    public static function note_viewed($noteorid) {
        global $USER;
        // Check if user can use notebook.
        self::can_use_notebook();
        $note = $noteorid;
        if (!is_object($note)) {
            $note = new local_notebook_posts($noteorid);
        }

        if ($USER->id != $note->get('usermodified')) {
            throw new \moodle_exception('usercannotreadnote', 'local_notebook');
        }
        // Trigger event.
        if ($note->get('courseid')) {
            $context = context_course::instance($note->get('courseid'));
        } else {
            $context = context_system::instance();
        }
        $event = \local_notebook\event\notebook_viewed::create(array(
            'objectid' => $note->get('id'),
            'userid' => $USER->id,
            'context' => $context
        ));
        $event->trigger();
        return true;
    }

    /**
     * Delete a note.
     *
     * @param int $noteid The note ID.
     * @return boolean
     */
    public static function delete_note($noteid) {
        global $USER, $DB;
        self::can_use_notebook();
        // Init note persistence.
        $notebook = new local_notebook_posts($noteid);
        if (!$notebook->get('id')) {
            throw new \moodle_exception('notenotfound', 'local_notebook');
        }

        if ($USER->id != $notebook->get('usermodified')) {
            throw new \moodle_exception('usercannotdeletenote', 'local_notebook');
        }

        $success = $notebook->delete();
        if ($success) {
            // Trigger event.
            if ($notebook->get('courseid')) {
                $context = context_course::instance($notebook->get('courseid'));
            } else {
                $context = context_system::instance();
            }
            $event = \local_notebook\event\notebook_deleted::create(array(
                'objectid' => $noteid,
                'userid' => $USER->id,
                'context' => $context
            ));
            $event->trigger();
        }
        return $success;
    }

    /**
     * Update a note.
     *
     * @param int $noteid The note ID.
     * @param string $note A note.
     * @param string $subject A subject for the note.
     * @param int $itemid Item id coming from draft editor (form hidden element).
     * @return boolean
     */
    public static function update_note($noteid, $note, $subject, $itemid = 0) {
        global $USER, $DB;
        self::can_use_notebook();
        // EDITOR_UNLIMITED_FILES is defined as -1, for some reason external passes constant as string in array below.

        // Init note persistence.
        $notebook = new local_notebook_posts($noteid);
        if ($notebook->get('courseid')) {
            $context = context_course::instance($notebook->get('courseid'));
        } else {
            $context = context_system::instance();
        }
        $definitionoptions = [
            'maxfiles' => -1,
            'trusttext' => true,
            'subdirs' => true,
            'noclean' => false,
            'context' => $context
        ];
        if (!$notebook->get('id')) {
            throw new \moodle_exception('notenotfound', 'local_notebook');
        }

        if ($USER->id != $notebook->get('usermodified')) {
            throw new \moodle_exception('usercannotupdatenote', 'local_notebook');
        }

        if (trim($note) == '') {
            throw new \moodle_exception('notecannotbeempty', 'local_notebook');
        }

        if (trim($subject) == '') {
            throw new \moodle_exception('subjectcannotbeempty', 'local_notebook');
        }

        $note = (object) [
            'summary_editor' => [
                'text' => $note,
                'format' => FORMAT_HTML,
                'itemid' => $itemid,
            ],
        ];
        $note = file_postupdate_standard_editor($note, 'summary', $definitionoptions, $context, 'local_notebook', 'summary',
            $itemid);
        $notebook->set('subject', $subject);
        $notebook->set('summary', $note->summary);
        $notebook->set('summaryformat', $note->summaryformat);
        $notebook->set('itemid', $itemid);
        $success = $notebook->update();
        if ($success) {
            // Trigger event.
            $event = \local_notebook\event\notebook_updated::create([
                'objectid' => $notebook->get('id'),
                // Set to null, so teacher can not access to the student note.
                'courseid' => null,
                'relateduserid' => $notebook->get('userid'),
                'userid' => $notebook->get('usermodified'),
                'context' => $context,
                'other' => array('courseid' => $notebook->get('courseid'), 'cmid' => $notebook->get('coursemoduleid'))
            ]);
            $event->trigger();
        }
        return $success;
    }

    /**
     * Returns a list of notes.
     *
     * @param int $userid The user ID.
     * @param int $courseid The course ID.
     * @param int $coursemoduleid The course module ID.
     * @return moodle_recordset recordset.
     */
    public static function notes_list($userid, $courseid, $coursemoduleid) {
        global $USER, $DB;
        self::can_use_notebook();
        $params = [];
        if ($courseid && $userid == 0) {
            $sql = "
                  SELECT DISTINCT(id)
                    FROM (
                 (SELECT 1 as ranking, p.*
                    FROM {" . local_notebook_posts::TABLE . "} p
                   WHERE p.courseid = :courseid
                         AND p.coursemoduleid = 0
                         AND p.userid = 0
                         AND p.usermodified = :userid1)
                   UNION
                 (SELECT 2 as ranking, p.*
                    FROM {" . local_notebook_posts::TABLE . "} p
                   WHERE p.courseid = :courseid2
                         AND (p.coursemoduleid <> 0 OR p.userid <> 0)
                         AND p.usermodified = :userid2)
                   UNION
                 (SELECT 3 as ranking, p.*
                    FROM {" . local_notebook_posts::TABLE . "} p
                   WHERE p.courseid <> 0
                         AND p.usermodified = :userid3)
                   UNION
                 (SELECT 4 as ranking, p.*
                    FROM {" . local_notebook_posts::TABLE . "} p
                   WHERE p.usermodified = :userid4)) a
                ORDER BY a.ranking ASC, a.created DESC, a.id DESC";
                $params['courseid'] = $courseid;
                $params['courseid2'] = $courseid;
                $params['userid1'] = $USER->id;
                $params['userid2'] = $USER->id;
                $params['userid3'] = $USER->id;
                $params['userid4'] = $USER->id;
        }

        if ($userid && $courseid == 0) {
            $sql = "
                  SELECT DISTINCT(id)
                    FROM (
                 (SELECT 1 as ranking, p.*
                    FROM {" . local_notebook_posts::TABLE . "} p
                   WHERE p.userid = :relateduserid
                         AND p.courseid = 0
                         AND p.usermodified = :userid1)
                   UNION
                 (SELECT 2 as ranking, p.*
                    FROM {" . local_notebook_posts::TABLE . "} p
                   WHERE p.userid = :relateduserid2
                         AND p.courseid <> 0
                         AND p.usermodified = :userid2)
                   UNION
                 (SELECT 3 as ranking, p.*
                    FROM {" . local_notebook_posts::TABLE . "} p
                   WHERE p.userid <> 0
                         AND p.usermodified = :userid3)
                   UNION
                 (SELECT 4 as ranking, p.*
                    FROM {" . local_notebook_posts::TABLE . "} p
                   WHERE p.usermodified = :userid4)) a
                ORDER BY a.ranking ASC, a.created DESC, a.id DESC";
                $params['relateduserid'] = $userid;
                $params['relateduserid2'] = $userid;
                $params['userid1'] = $USER->id;
                $params['userid2'] = $USER->id;
                $params['userid3'] = $USER->id;
                $params['userid4'] = $USER->id;
        }

        if ($userid && $courseid) {
            $sql = "
                  SELECT DISTINCT(id)
                    FROM (
                 (SELECT 1 as ranking, p.*
                    FROM {" . local_notebook_posts::TABLE . "} p
                   WHERE p.userid = :relateduserid
                         AND p.courseid = :courseid
                         AND p.usermodified = :userid1)
                   UNION
                 (SELECT 2 as ranking, p.*
                    FROM {" . local_notebook_posts::TABLE . "} p
                   WHERE p.userid = :relateduserid2
                         AND p.usermodified = :userid2)
                   UNION
                 (SELECT 3 as ranking, p.*
                    FROM {" . local_notebook_posts::TABLE . "} p
                   WHERE p.userid <> 0
                         AND p.usermodified = :userid3)
                   UNION
                 (SELECT 4 as ranking, p.*
                    FROM {" . local_notebook_posts::TABLE . "} p
                   WHERE p.usermodified = :userid4)) a
                ORDER BY a.ranking ASC, a.created DESC, a.id DESC";
                $params['relateduserid'] = $userid;
                $params['relateduserid2'] = $userid;
                $params['courseid'] = $courseid;
                $params['userid1'] = $USER->id;
                $params['userid2'] = $USER->id;
                $params['userid3'] = $USER->id;
                $params['userid4'] = $USER->id;
        }

        if ($coursemoduleid) {
            $sql = "
                  SELECT DISTINCT(id)
                    FROM (
                 (SELECT 1 as ranking, p.*
                    FROM {" . local_notebook_posts::TABLE . "} p
                   WHERE p.coursemoduleid = :coursemoduleid
                         AND p.usermodified = :userid1)
                   UNION
                 (SELECT 2 as ranking, p.*
                    FROM {" . local_notebook_posts::TABLE . "} p
                   WHERE p.coursemoduleid = 0
                         AND  p.courseid = :courseid
                         AND p.usermodified = :userid2)
                   UNION
                 (SELECT 3 as ranking, p.*
                    FROM {" . local_notebook_posts::TABLE . "} p
                   WHERE p.coursemoduleid <> 0
                         AND  p.courseid = :courseid2
                         AND p.usermodified = :userid3)
                   UNION
                 (SELECT 4 as ranking, p.*
                    FROM {" . local_notebook_posts::TABLE . "} p
                   WHERE p.coursemoduleid <> 0
                         AND p.usermodified = :userid4)
                   UNION
                 (SELECT 5 as ranking, p.*
                    FROM {" . local_notebook_posts::TABLE . "} p
                   WHERE p.courseid <> 0
                         AND p.usermodified = :userid5)
                   UNION
                 (SELECT 6 as ranking, p.*
                    FROM {" . local_notebook_posts::TABLE . "} p
                   WHERE p.usermodified = :userid6)) a
                ORDER BY a.ranking ASC, a.created DESC, a.id DESC";
                $cm = get_coursemodule_from_id('', $coursemoduleid, 0, true, MUST_EXIST);
                $params['coursemoduleid'] = $cm->id;
                $params['courseid'] = $cm->course;
                $params['courseid2'] = $cm->course;
                $params['userid1'] = $USER->id;
                $params['userid2'] = $USER->id;
                $params['userid3'] = $USER->id;
                $params['userid4'] = $USER->id;
                $params['userid5'] = $USER->id;
                $params['userid6'] = $USER->id;
        }
        if ($coursemoduleid == 0 && $userid == 0 && $courseid == 0) {
            $sql = "
                  SELECT DISTINCT(id)
                    FROM (
                 (SELECT 1 as ranking, p.*
                    FROM {" . local_notebook_posts::TABLE . "} p
                   WHERE p.userid = 0
                         AND p.courseid = 0
                         AND p.coursemoduleid = 0
                         AND p.usermodified = :userid1)
                   UNION
                 (SELECT 2 as ranking, p.*
                    FROM {" . local_notebook_posts::TABLE . "} p
                   WHERE p.usermodified = :userid2)) a
                ORDER BY a.ranking ASC, a.created DESC, a.id DESC";
                $params['userid1'] = $USER->id;
                $params['userid2'] = $USER->id;
        }
        return $DB->get_recordset_sql($sql, $params);
    }

    /**
     * Throws an exception if we can not use notebook.
     *
     * @return void
     * @throws moodle_exception
     */
    public static function can_use_notebook() {
        if (!\local_notebook\helper::has_to_display_notebook()) {
            throw new moodle_exception('cannotusenotebook', 'local_notebook');
        }
    }
}
