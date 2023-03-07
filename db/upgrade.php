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
 * Plugin upgrade code
 *
 * @package    local_notebook
 * @copyright  Catalyst IT Canada 2023
 * @author     Ghaly Marc-Alexandre <marc-alexandreghaly@catalyst-ca.net>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Function to upgrade local_notebook.
 *
 * @param int $oldversion the version we are upgrading from
 * @return bool result
 */
function xmldb_local_notebook_upgrade($oldversion) {
    global $DB;
    $dbman = $DB->get_manager();

    if ($oldversion < 2022091401) {
        // Define table local_notebook_posts to be created.
        $table = new xmldb_table('local_notebook_posts');

        // Adding fields to table local_notebook_posts.
        $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE, null);
        $table->add_field('userid', XMLDB_TYPE_INTEGER, '10', null, null, null, null);
        $table->add_field('courseid', XMLDB_TYPE_INTEGER, '10', null, null, null, null);
        $table->add_field('coursemoduleid', XMLDB_TYPE_INTEGER, '10', null, null, null, null);
        $table->add_field('created', XMLDB_TYPE_INTEGER, '10', null, null, null, null);
        $table->add_field('lastmodified', XMLDB_TYPE_INTEGER, '10', null, null, null, null);
        $table->add_field('coursename', XMLDB_TYPE_CHAR, '255', null, null, null, null);
        $table->add_field('activityname', XMLDB_TYPE_CHAR, '255', null, null, null, null);
        $table->add_field('subject', XMLDB_TYPE_TEXT, null, null, null, null, null);
        $table->add_field('summary', XMLDB_TYPE_TEXT, null, null, null, null, null);
        $table->add_field('summaryformat', XMLDB_TYPE_INTEGER, '2', null, null, null, null);
        $table->add_field('format', XMLDB_TYPE_INTEGER, '10', null, null, null, null);
        $table->add_field('usermodified', XMLDB_TYPE_INTEGER, '10', null, null, null, null);

        // Adding keys to table local_notebook_posts.
        $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);

        // Conditionally launch create table for local_notebook_posts.
        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }

        // Notebook savepoint reached.
        upgrade_plugin_savepoint(true, 2022091401, 'local', 'notebook');
    }

    if ($oldversion < 2023030600) {
        $table = new xmldb_table('local_notebook_posts');
        $field = new xmldb_field('itemid', XMLDB_TYPE_INTEGER, '20', null, null, null, null);
        // Conditionally launch add field itemid.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }
        // Notebook savepoint reached.
        upgrade_plugin_savepoint(true, 2023030600, 'local', 'notebook');
    }

    if ($oldversion < 2023030800) {
        // Notebook savepoint reached.
        upgrade_plugin_savepoint(true, 2023030800, 'local', 'notebook');
    }
}
