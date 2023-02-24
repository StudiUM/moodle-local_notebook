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

namespace local_notebook\event;

use moodle_exception;

/**
 * Event observer for course deletion.
 *
 * @package    local_notebook
 * @copyright  Catalyst IT Canada 2023
 * @author     Ghaly Marc-Alexandre <marc-alexandreghaly@catalyst-ca.net>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class course_deleted_observer {
    /**
     * Updates a course id on course deletion.
     *
     * @param \core\event\course_deleted $event
     */
    public static function update_course_id(\core\event\course_deleted $event) {
        global $DB;

        $data = $event->get_data();
        $courseid = $data['courseid'];
        try {
            $transaction = $DB->start_delegated_transaction();
            $sql = "UPDATE {local_notebook_posts}
                       SET courseid = 0
                     WHERE courseid = :courseid";
            $DB->execute($sql, ['courseid' => $courseid]);
            $transaction->allow_commit();
        } catch (moodle_exception $e) {
            $transaction->rollback($e);
        }
    }
}
