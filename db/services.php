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
 * Notebook webservice functions.
 *
 * @package    local_notebook
 * @author     Issam Taboubi <issam.taboubi@umontreal.ca>
 * @copyright  2021 Université de Montréal
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$functions = array(
    'local_notebook_add_note' => array(
        'classname'    => 'local_notebook\external',
        'methodname'   => 'add_note',
        'classpath'    => '',
        'description'  => 'Add note in notebook',
        'type'         => 'write',
        'ajax'         => true,
    ),
    'local_notebook_read_note' => array(
        'classname'    => 'local_notebook\external',
        'methodname'   => 'read_note',
        'classpath'    => '',
        'description'  => 'Read note in notebook',
        'type'         => 'read',
        'ajax'         => true,
    ),
    'local_notebook_update_note' => array(
        'classname'    => 'local_notebook\external',
        'methodname'   => 'update_note',
        'classpath'    => '',
        'description'  => 'Update note in notebook',
        'type'         => 'write',
        'ajax'         => true,
    ),
    'local_notebook_notes_list' => array(
        'classname'    => 'local_notebook\external',
        'methodname'   => 'notes_list',
        'classpath'    => '',
        'description'  => 'List of notes',
        'type'         => 'read',
        'ajax'         => true,
    ),
    'local_notebook_delete_notes' => array(
        'classname'    => 'local_notebook\external',
        'methodname'   => 'delete_notes',
        'classpath'    => '',
        'description'  => 'Delete notes in notebook',
        'type'         => 'write',
        'ajax'         => true,
    )
);

