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
 * Event observer for an updated course module.
 *
 * @package    local_notebook
 * @copyright  Catalyst IT Canada 2023
 * @author     Ghaly Marc-Alexandre <marc-alexandreghaly@catalyst-ca.net>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class course_module_updated_observer {
    /**
     * Update a course module name on cm update.
     *
     * @param \core\event\course_module_updated $event
     */
    public static function update_course_module_name(\core\event\course_module_updated $event) {
        global $DB;

        $data = $event->get_data();
        $cmid = $data['contextinstanceid'];
        $cmname = $data['other']['name'];
        try {
            $transaction = $DB->start_delegated_transaction();
            $params = ['activityname' => $cmname, 'coursemoduleid' => $cmid];
            $sql = "UPDATE {local_notebook_posts}
                       SET activityname = :activityname
                     WHERE coursemoduleid = :coursemoduleid";
            $DB->execute($sql, $params);
            $transaction->allow_commit();
        } catch (moodle_exception $e) {
            $transaction->rollback($e);
        }
    }
}
