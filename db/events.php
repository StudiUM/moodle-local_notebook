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
 * This file defines observers needed by the plugin.
 *
 * @package    local_notebook
 * @copyright  Catalyst IT Canada 2023
 * @author     Ghaly Marc-Alexandre <marc-alexandreghaly@catalyst-ca.net>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$observers = [
    [
        'eventname' => '\core\event\course_updated',
        'callback' => '\local_notebook\event\course_updated_observer::update_course_name',
    ],
    [
        'eventname' => '\core\event\course_deleted',
        'callback' => '\local_notebook\event\course_deleted_observer::update_course_id',
    ],
    [
        'eventname' => '\core\event\course_module_updated',
        'callback' => '\local_notebook\event\course_module_updated_observer::update_course_module_name',
    ],
    [
        'eventname' => '\core\event\course_module_deleted',
        'callback' => '\local_notebook\event\course_module_deleted_observer::update_course_module_id',
    ],
];
