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

namespace local_notebook;

use context_user;
use lang_string;
use \core\persistent;

/**
 * Local notebook posts persistent table class.
 *
 * @package    local_notebook
 * @copyright  2021 Université de Montréal
 * @author     Issam Taboubi <issam.taboubi@umontreal.ca>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class local_notebook_posts extends persistent {

    /** The table name. */
    const TABLE = 'local_notebook_posts';

    /**
     * Return the definition of the properties of this model.
     *
     * @return array
     */
    protected static function define_properties() {
        return [
            'userid' => [
                'type' => PARAM_INT,
                'default' => 0
            ],
            'courseid' => [
                'type' => PARAM_INT,
                'default' => 0
            ],
            'coursemoduleid' => [
                'type' => PARAM_INT,
                'default' => 0
            ],
            'created' => [
                'type' => PARAM_INT,
                'default' => 0
            ],
            'lastmodified' => [
                'type' => PARAM_INT,
                'default' => 0
            ],
            'coursename' => [
                'type' => PARAM_TEXT,
                'default' => ''
            ],
            'activityname' => [
                'type' => PARAM_TEXT,
                'default' => ''
            ],
            'subject' => [
                'type' => PARAM_TEXT,
                'default' => ''
            ],
            'summary' => [
                'type' => PARAM_CLEANHTML,
                'default' => '',
            ],
            'summaryformat' => [
                'type' => PARAM_INT,
                'default' => FORMAT_HTML
            ],
            'format' => [
                'type' => PARAM_INT,
                'default' => 0
            ],
            'usermodified' => [
                'type' => PARAM_INT,
                'null' => NULL_NOT_ALLOWED
            ],
        ];
    }

    /**
     * Hook to execute before a create.
     *
     * @return void
     */
    protected function before_create() {
        $now = time();
        $this->set('created', $now);
        $this->set('lastmodified', $now);
    }

    /**
     * Hook to execute before an update.
     *
     * @return void
     */
    protected function before_update() {
        $this->set('lastmodified', time());
    }

}
