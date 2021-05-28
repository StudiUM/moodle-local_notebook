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
 * Class for notebook api.
 *
 * @package    local_notebook
 * @copyright  2021 Université de Montréal
 * @author     Issam Taboubi <issam.taboubi@umontreal.ca>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
namespace local_notebook;
defined('MOODLE_INTERNAL') || die();

use stdClass;
use coding_exception;
use moodle_exception;
use context_course;
use context_system;
use core_course_category;

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
     * @return int the note id.
     */
    public static function add_note($note, $subject, $userid, $courseid, $coursemoduleid) {
        global $USER, $DB;
        // Init note persistence.
        $notebook = new \local_notebook\post();
        if ($courseid) {
            $course = $DB->get_record('course', array('id' => $courseid), '*', MUST_EXIST);
            if (!core_course_category::can_view_course_info($course)) {
                throw new \moodle_exception('usercannotaccesscourse', 'local_notebook');
            }
            $notebook->set('courseid', $course->id);
        }

        if ($userid) {
            $user = $DB->get_record('user', array('id' => $userid), '*', MUST_EXIST);
            if ($courseid) {
                $context = context_course::instance($course->id, MUST_EXIST);
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
        }

        if (trim($note) == '') {
            throw new \moodle_exception('notecannotbeempty', 'local_notebook');
        }

        if (trim($subject) == '') {
            throw new \moodle_exception('subjectcannotbeempty', 'local_notebook');
        }
        $notebook->set('subject', $subject);
        $notebook->set('summary', $note);
        $success = $notebook->create();
        if ($success) {
            // Trigger event.
            if ($notebook->get('courseid')) {
                $context = context_course::instance($notebook->get('courseid'));
            } else {
                $context = context_system::instance();
            }
            $event = \local_notebook\event\notebook_created::create(array(
                'objectid' => $notebook->get('id'),
                // Set to null, so teacher can not access to the student note.
                'courseid' => null,
                'relateduserid' => $notebook->get('userid'),
                'userid' => $notebook->get('usermodified'),
                'context' => $context,
                'other' => array('courseid' => $notebook->get('courseid'), 'cmid' => $notebook->get('coursemoduleid'))
            ));
            $event->trigger();
        }
        return $notebook->get('id');
    }

    /**
     * Delete a note.
     *
     * @param int $noteid The note ID.
     * @return boolean
     */
    public static function delete_note($noteid) {
        global $USER, $DB;
        // Init note persistence.
        $notebook = new \local_notebook\post($noteid);
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
     * @return boolean
     */
    public static function update_note($noteid, $note, $subject) {
        global $USER, $DB;
        // Init note persistence.
        $notebook = new \local_notebook\post($noteid);
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
        $notebook->set('subject', $subject);
        $notebook->set('summary', $note);
        $success = $notebook->update();
        if ($success) {
            // Trigger event.
            if ($notebook->get('courseid')) {
                $context = context_course::instance($notebook->get('courseid'));
            } else {
                $context = context_system::instance();
            }
            $event = \local_notebook\event\notebook_updated::create(array(
                'objectid' => $notebook->get('id'),
                // Set to null, so teacher can not access to the student note.
                'courseid' => null,
                'relateduserid' => $notebook->get('userid'),
                'userid' => $notebook->get('usermodified'),
                'context' => $context,
                'other' => array('courseid' => $notebook->get('courseid'), 'cmid' => $notebook->get('coursemoduleid'))
            ));
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
        $params = [];
        if ($courseid && $userid == 0) {
            $sql = "
                  SELECT DISTINCT(id)
                    FROM (
                 (SELECT 1 as rank, p.*
                    FROM {" . \local_notebook\post::TABLE . "} p
                   WHERE p.courseid = :courseid
                         AND p.coursemoduleid = 0
                         AND p.userid = 0
                         AND p.usermodified = :userid1
                         AND p.module = 'notebook')
                   UNION
                 (SELECT 2 as rank, p.*
                    FROM {" . \local_notebook\post::TABLE . "} p
                   WHERE p.courseid = :courseid2
                         AND (p.coursemoduleid <> 0 OR p.userid <> 0)
                         AND p.usermodified = :userid2
                         AND p.module = 'notebook')
                   UNION
                 (SELECT 3 as rank, p.*
                    FROM {" . \local_notebook\post::TABLE . "} p
                   WHERE p.courseid <> 0
                         AND p.usermodified = :userid3
                         AND p.module = 'notebook')
                   UNION
                 (SELECT 4 as rank, p.*
                    FROM {" . \local_notebook\post::TABLE . "} p
                   WHERE p.usermodified = :userid4
                         AND p.module = 'notebook')) a
                ORDER BY a.rank ASC, a.created DESC, a.id DESC";
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
                 (SELECT 1 as rank, p.*
                    FROM {" . \local_notebook\post::TABLE . "} p
                   WHERE p.userid = :relateduserid
                         AND p.courseid = 0
                         AND p.usermodified = :userid1
                         AND p.module = 'notebook')
                   UNION
                 (SELECT 2 as rank, p.*
                    FROM {" . \local_notebook\post::TABLE . "} p
                   WHERE p.userid = :relateduserid2
                         AND p.courseid <> 0
                         AND p.usermodified = :userid2
                         AND p.module = 'notebook')
                   UNION
                 (SELECT 3 as rank, p.*
                    FROM {" . \local_notebook\post::TABLE . "} p
                   WHERE p.userid <> 0
                         AND p.usermodified = :userid3
                         AND p.module = 'notebook')
                   UNION
                 (SELECT 4 as rank, p.*
                    FROM {" . \local_notebook\post::TABLE . "} p
                   WHERE p.usermodified = :userid4
                         AND p.module = 'notebook')) a
                ORDER BY a.rank ASC, a.created DESC, a.id DESC";
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
                 (SELECT 1 as rank, p.*
                    FROM {" . \local_notebook\post::TABLE . "} p
                   WHERE p.userid = :relateduserid
                         AND p.courseid = :courseid
                         AND p.usermodified = :userid1
                         AND p.module = 'notebook')
                   UNION
                 (SELECT 2 as rank, p.*
                    FROM {" . \local_notebook\post::TABLE . "} p
                   WHERE p.userid = :relateduserid2
                         AND p.usermodified = :userid2
                         AND p.module = 'notebook')
                   UNION
                 (SELECT 3 as rank, p.*
                    FROM {" . \local_notebook\post::TABLE . "} p
                   WHERE p.userid <> 0
                         AND p.usermodified = :userid3
                         AND p.module = 'notebook')
                   UNION
                 (SELECT 4 as rank, p.*
                    FROM {" . \local_notebook\post::TABLE . "} p
                   WHERE p.usermodified = :userid4
                         AND p.module = 'notebook')) a
                ORDER BY a.rank ASC, a.created DESC, a.id DESC";
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
                 (SELECT 1 as rank, p.*
                    FROM {" . \local_notebook\post::TABLE . "} p
                   WHERE p.coursemoduleid = :coursemoduleid
                         AND p.usermodified = :userid1
                         AND p.module = 'notebook')
                   UNION
                 (SELECT 2 as rank, p.*
                    FROM {" . \local_notebook\post::TABLE . "} p
                   WHERE p.coursemoduleid = 0
                         AND  p.courseid = :courseid
                         AND p.usermodified = :userid2
                         AND p.module = 'notebook')
                   UNION
                 (SELECT 3 as rank, p.*
                    FROM {" . \local_notebook\post::TABLE . "} p
                   WHERE p.coursemoduleid <> 0
                         AND  p.courseid = :courseid2
                         AND p.usermodified = :userid3
                         AND p.module = 'notebook')
                   UNION
                 (SELECT 4 as rank, p.*
                    FROM {" . \local_notebook\post::TABLE . "} p
                   WHERE p.coursemoduleid <> 0
                         AND p.usermodified = :userid4
                         AND p.module = 'notebook')
                   UNION
                 (SELECT 5 as rank, p.*
                    FROM {" . \local_notebook\post::TABLE . "} p
                   WHERE p.courseid <> 0
                         AND p.usermodified = :userid5
                         AND p.module = 'notebook')
                   UNION
                 (SELECT 6 as rank, p.*
                    FROM {" . \local_notebook\post::TABLE . "} p
                   WHERE p.usermodified = :userid6
                         AND p.module = 'notebook')) a
                ORDER BY a.rank ASC, a.created DESC, a.id DESC";
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
                 (SELECT 1 as rank, p.*
                    FROM {" . \local_notebook\post::TABLE . "} p
                   WHERE p.userid = 0
                         AND p.courseid = 0
                         AND p.coursemoduleid = 0
                         AND p.usermodified = :userid1
                         AND p.module = 'notebook')
                   UNION
                 (SELECT 2 as rank, p.*
                    FROM {" . \local_notebook\post::TABLE . "} p
                   WHERE p.usermodified = :userid2
                         AND p.module = 'notebook')) a
                ORDER BY a.rank ASC, a.created DESC, a.id DESC";
                $params['userid1'] = $USER->id;
                $params['userid2'] = $USER->id;
        }
        return $DB->get_recordset_sql($sql, $params);
    }
}