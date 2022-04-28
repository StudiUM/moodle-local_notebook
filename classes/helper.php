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
 * Notebook helper class.
 *
 * @package    local_notebook
 * @copyright  2022 Université de Montréal
 * @author     Issam Taboubi <issam.taboubi@umontreal.ca>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_notebook;

/**
 * Notebook helper class.
 *
 * @package    local_notebook
 * @copyright  2022 Université de Montréal
 * @author     Issam Taboubi <issam.taboubi@umontreal.ca>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class helper {

    /**
     * Renders the notebook drawer.
     *
     * @return string The HTML.
     */
    public static function render_notebook_drawer() {
        global $USER, $PAGE;
        if (!self::has_to_display_notebook()) {
            return;
        }
        $courseid = 0;
        $coursemoduleid = 0;
        $context = $PAGE->context;
        if ($context->contextlevel == CONTEXT_MODULE) {
            $coursemoduleid = $context->instanceid;
            $courseid = $PAGE->course->id;
        } else if ($context->contextlevel == CONTEXT_COURSE) {
            $courseid = $PAGE->course->id;
        }
        $renderer = $PAGE->get_renderer('core');
        return $renderer->render_from_template('local_notebook/notebook_drawer',
        ['userid' => $USER->id, 'courseid' => $courseid, 'coursemoduleid' => $coursemoduleid]);
    }

    /**
     * Renders the notebook button.
     *
     * @return string The HTML.
     */
    public static function render_notebook_button() {
        global $USER, $CFG, $PAGE;
        if (!self::has_to_display_notebook()) {
            return;
        }
        // Early bail out conditions.
        if (empty($CFG->messaging) || !isloggedin() || isguestuser() || user_not_fully_set_up($USER) ||
            get_user_preferences('auth_forcepasswordchange') ||
            (!$USER->policyagreed && !is_siteadmin() &&
                ($manager = new \core_privacy\local\sitepolicy\manager()) && $manager->is_defined())) {
            return '';
        } else {
            $renderer = $PAGE->get_renderer('core');
            return $renderer->render_from_template('local_notebook/notebookbutton', []);
        }
    }

    /**
     * Verify if we can display the notebook for current page.
     */
    public static function has_to_display_notebook() {
        global $PAGE;
        if (in_array($PAGE->pagelayout,
            ['maintenance',
            'print',
            'secure',
            'embedded',
            'redirect']) || !isloggedin() || isguestuser()) {
            // Do not try to show the notebook button in (maintenance/secure/embedded) mode,
            // when printing, or during redirects.
            return false;
        }
        return true;
    }
}
