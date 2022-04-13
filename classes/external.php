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
 * External API.
 *
 * @package    local_notebook
 * @copyright  2021 Université de Montréal
 * @author     Issam Taboubi <issam.taboubi@umontreal.ca>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_notebook;
defined('MOODLE_INTERNAL') || die();

require_once("$CFG->libdir/externallib.php");

use context_system;
use external_api;
use external_function_parameters;
use external_value;
use external_multiple_structure;
use \local_notebook\api;
use \local_notebook\post;

/**
 * External API class.
 *
 * @package    local_notebook
 * @copyright  2021 Université de Montréal
 * @author     Issam Taboubi <issam.taboubi@umontreal.ca>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class external extends external_api {

    /**
     * Returns description of external function parameters.
     *
     * @return \external_function_parameters
     */
    public static function add_note_parameters() {
        $userid = new external_value(
            PARAM_INT,
            'User ID',
            VALUE_DEFAULT
        );
        $courseid = new external_value(
            PARAM_INT,
            'Course ID',
            VALUE_DEFAULT
        );
        $coursemoduleid = new external_value(
            PARAM_INT,
            'Course module ID',
            VALUE_DEFAULT
        );
        $note = new external_value(
            PARAM_RAW,
            'A note',
            VALUE_REQUIRED
        );
        $subject = new external_value(
            PARAM_RAW,
            'A subject',
            VALUE_REQUIRED
        );

        $params = array(
            'note' => $note,
            'subject' => $subject,
            'userid' => $userid,
            'courseid' => $courseid,
            'coursemoduleid' => $coursemoduleid,
        );
        return new external_function_parameters($params);
    }

    /**
     * Add a note.
     *
     * @param string $note A note.
     * @param string $subject A subject for the note.
     * @param int $userid The user ID.
     * @param int $courseid The course ID.
     * @param int $coursemoduleid The course module ID.
     * @return int note id
     */
    public static function add_note($note, $subject, $userid, $courseid, $coursemoduleid) {
        global $USER, $PAGE;
        $params = self::validate_parameters(self::add_note_parameters(), array(
            'userid' => $userid,
            'courseid' => $courseid,
            'coursemoduleid' => $coursemoduleid,
            'note' => $note,
            'subject' => $subject
        ));
        return api::add_note(
            $params['note'],
            $params['subject'],
            $params['userid'],
            $params['courseid'],
            $params['coursemoduleid']);
    }

    /**
     * Returns description of add_note() result value.
     *
     * @return \external_description
     */
    public static function add_note_returns() {
        return new external_value(PARAM_INT, 'the ID of the note created');
    }

    /**
     * Returns description of external function parameters.
     *
     * @return \external_function_parameters
     */
    public static function update_note_parameters() {
        $noteid = new external_value(
            PARAM_INT,
            'Note ID',
            VALUE_REQUIRED
        );
        $note = new external_value(
            PARAM_RAW,
            'A note',
            VALUE_REQUIRED
        );
        $subject = new external_value(
            PARAM_RAW,
            'A subject',
            VALUE_REQUIRED
        );

        $params = array(
            'noteid' => $noteid,
            'note' => $note,
            'subject' => $subject
        );
        return new external_function_parameters($params);
    }

    /**
     * Update a note.
     *
     * @param int $noteid The note ID.
     * @param string $note A note.
     * @param string $subject A subject for the note.
     * @return bool
     */
    public static function update_note($noteid, $note, $subject) {
        global $USER, $PAGE;
        $params = self::validate_parameters(self::update_note_parameters(), array(
            'noteid' => $noteid,
            'note' => $note,
            'subject' => $subject
        ));
        return api::update_note(
            $params['noteid'],
            $params['note'],
            $params['subject']);
    }

    /**
     * Returns description of update_note() result value.
     *
     * @return \external_description
     */
    public static function update_note_returns() {
        return new external_value(PARAM_BOOL, 'True if update was successful.');
    }

    /**
     * Returns description of delete_notes parameters
     *
     * @return \external_function_parameters
     */
    public static function delete_notes_parameters() {
        return new external_function_parameters(
            array(
                "notes" => new external_multiple_structure(
                    new external_value(PARAM_INT, 'ID of the note to be deleted'), 'Array of Note Ids to be deleted.'
                )
            )
        );
    }

    /**
     * Delete notes.
     *
     * @param array $notes An array of ids for the notes to delete.
     * @return boolean
     */
    public static function delete_notes($notes = []) {
        global $CFG;

        $params = self::validate_parameters(self::delete_notes_parameters(), array('notes' => $notes));

        $warnings = array();
        foreach ($params['notes'] as $noteid) {
            api::delete_note($noteid);
        }
        return true;
    }

    /**
     * Returns description of delete_notes result value.
     *
     */
    public static function delete_notes_returns() {
        return new external_value(PARAM_BOOL, 'True if delete was successfull.');
    }

    /**
     * Returns description of external function parameters.
     *
     * @return \external_function_parameters
     */
    public static function read_note_parameters() {
        $noteid = new external_value(
            PARAM_INT,
            'Note ID',
            VALUE_REQUIRED
        );

        $params = array(
            'noteid' => $noteid
        );
        return new external_function_parameters($params);
    }

    /**
     * Read a note.
     *
     * @param int $noteid The note ID.
     * @return array
     */
    public static function read_note($noteid) {
        global $USER, $PAGE;
        $params = self::validate_parameters(self::read_note_parameters(), array(
            'noteid' => $noteid
        ));

        $output = $PAGE->get_renderer('core');
        // Check if user can use notebook.
        api::can_use_notebook();
        $note = new post($params['noteid']);
        if ($USER->id != $note->get('usermodified')) {
            throw new \moodle_exception('usercannotreadnote', 'local_notebook');
        }
        $exporter = new \local_notebook\external\notebook_exporter($note, array('context' => context_system::instance()));
        $record = $exporter->export($output);

        return $record;
    }

    /**
     * Returns description of read_note() result value.
     *
     * @return \external_description
     */
    public static function read_note_returns() {
        return \local_notebook\external\notebook_exporter::get_read_structure();
    }

    /**
     * Returns description of external function parameters.
     *
     * @return \external_function_parameters
     */
    public static function notes_list_parameters() {
        $userid = new external_value(
            PARAM_INT,
            'User ID',
            VALUE_DEFAULT
        );
        $courseid = new external_value(
            PARAM_INT,
            'Course ID',
            VALUE_DEFAULT
        );
        $coursemoduleid = new external_value(
            PARAM_INT,
            'Course module ID',
            VALUE_DEFAULT
        );

        $params = array(
            'userid' => $userid,
            'courseid' => $courseid,
            'coursemoduleid' => $coursemoduleid,
        );
        return new external_function_parameters($params);
    }

    /**
     * Notes list.
     *
     * @param int $userid The user ID.
     * @param int $courseid The course ID.
     * @param int $coursemoduleid The course module ID.
     * @return array
     */
    public static function notes_list($userid, $courseid, $coursemoduleid) {
        global $USER, $PAGE;
        $params = self::validate_parameters(self::notes_list_parameters(), array(
            'userid' => $userid,
            'courseid' => $courseid,
            'coursemoduleid' => $coursemoduleid,
        ));

        $output = $PAGE->get_renderer('core');
        $records = api::notes_list(
            $params['userid'],
            $params['courseid'],
            $params['coursemoduleid']);
        $results = array();
        foreach ($records as $record) {
            unset($record->ranking);
            $note = new post($record->id);
            $exporter = new \local_notebook\external\notebook_exporter($note, array('context' => context_system::instance()));
            $r = $exporter->export($output);
            array_push($results, $r);
        }
        return $results;
    }

    /**
     * Returns description of notes_list() result value.
     *
     * @return \external_description
     */
    public static function notes_list_returns() {
        return new external_multiple_structure(\local_notebook\external\notebook_exporter::get_read_structure());
    }

}
