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
 * Post table persistent.
 *
 * @package    local_notebook
 * @copyright  2021 Université de Montréal
 * @author     Issam Taboubi <issam.taboubi@umontreal.ca>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_notebook;

use context_user;
use lang_string;
use \core\persistent;

/**
 * Post table persistent class.
 *
 * @package    local_notebook
 * @copyright  2021 Université de Montréal
 * @author     Issam Taboubi <issam.taboubi@umontreal.ca>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class post extends persistent {

    /** The table name. */
    const TABLE = 'post';

    /** The module name. */
    const MODULE = 'notebook';

    /** Publish state */
    const PUBLISHSTATE = 'site';

    /**
     * Return the definition of the properties of this model.
     *
     * @return array
     */
    protected static function define_properties() {
        return array(
            'userid' => array(
                'type' => PARAM_INT,
                'default' => 0
            ),
            'courseid' => array(
                'type' => PARAM_INT,
                'default' => 0
            ),
            'groupid' => array(
                'type' => PARAM_INT,
                'default' => 0
            ),
            'moduleid' => array(
                'type' => PARAM_INT,
                'default' => 0
            ),
            'coursemoduleid' => array(
                'type' => PARAM_INT,
                'default' => 0
            ),
            'created' => array(
                'type' => PARAM_INT,
                'default' => 0
            ),
            'lastmodified' => array(
                'type' => PARAM_INT,
                'default' => 0
            ),
            'rating' => array(
                'type' => PARAM_INT,
                'default' => 0
            ),
            'module' => array(
                'type' => PARAM_TEXT,
                'default' => self::MODULE
            ),
            'publishstate' => array(
                'type' => PARAM_TEXT,
                'default' => self::PUBLISHSTATE
            ),
            'subject' => array(
                'type' => PARAM_TEXT,
                'default' => ''
            ),
            'summary' => array(
                'type' => PARAM_CLEANHTML,
                'default' => '',
            ),
            'content' => array(
                'type' => PARAM_CLEANHTML,
                'default' => '',
            ),
            'uniquehash' => array(
                'type' => PARAM_TEXT,
                'default' => '',
            ),
            'summaryformat' => array(
                'type' => PARAM_INT,
                'default' => FORMAT_HTML
            ),
            'format' => array(
                'type' => PARAM_INT,
                'default' => 0
            ),
            'attachment' => array(
                'type' => PARAM_TEXT,
                'null' => NULL_ALLOWED,
                'default' => null
            )
        );
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
