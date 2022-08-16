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

use context_user;

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
        global $PAGE;
        if (!self::has_to_display_notebook()) {
            return;
        }
        list($relateduserid, $courseid, $coursemoduleid) = self::get_list_info_from_page();
        $subject = self::prepare_subject($relateduserid, $courseid, $coursemoduleid);
        $data = new \Stdclass;
        $data->subject = $subject;
        $data->subjectorigin = $subject;
        $form = new \local_notebook\form\note();
        $form->set_data($data);
        ob_start();
        $form->display();
        $formhtml = ob_get_contents();
        ob_end_clean();

        $renderer = $PAGE->get_renderer('core');
        return $renderer->render_from_template('local_notebook/notebook_drawer',
        ['userid' => $relateduserid, 'courseid' => $courseid, 'coursemoduleid' => $coursemoduleid, 'form' => $formhtml]);
    }

    /**
     * Get list info from page.
     *
     * @return array array of 3 elements $relateduserid, $courseid and $coursemoduleid.
     */
    public static function get_list_info_from_page() {
        global $USER, $PAGE;
        $courseid = 0;
        $coursemoduleid = 0;
        $relateduserid = 0;
        $context = $PAGE->context;
        if ($context->contextlevel == CONTEXT_MODULE) {
            $coursemoduleid = $context->instanceid;
            $courseid = $PAGE->course->id;
        } else if ($context->contextlevel == CONTEXT_COURSE) {
            $courseid = $PAGE->course->id;
            if ($PAGE->url->get_path() == '/user/view.php' && $PAGE->url->get_param('id')) {
                $relateduserid = $PAGE->url->get_param('id');
            }
            // Frontpage.
            if ($courseid == 1) {
                $courseid = 0;
            }
        } else if ($context->contextlevel == CONTEXT_USER && $PAGE->context->instanceid != $USER->id) {
            $relateduserid = $PAGE->context->instanceid;
        }
        return [$relateduserid, $courseid, $coursemoduleid];
    }

    /**
     * Prepare subject form form
     *
     * @param int $relateduserid The related user ID
     * @param int $courseid The course ID
     * @param int $coursemoduleid The course module ID
     * @return string The subject
     */
    public static function prepare_subject($relateduserid, $courseid, $coursemoduleid) {
        global $PAGE;
        $count = self::count_notes($relateduserid, $courseid, $coursemoduleid);
        $count += 1;
        if ($courseid) {
            $a = ['count' => $count, 'name' => $PAGE->course->shortname];
            $subject = get_string('noteforcourse', 'local_notebook', $a);
            if ($coursemoduleid) {
                $a = ['count' => $count,
                'name' => get_fast_modinfo($PAGE->course->id)->get_cm($PAGE->context->instanceid)->get_formatted_name()];
                $subject = get_string('noteforcoursemodule', 'local_notebook', $a);
            } else if ($relateduserid) {
                $user = \core_user::get_user($relateduserid);
                $a = ['count' => $count, 'name' => fullname($user)];
                $subject = get_string('noteforuser', 'local_notebook', $a);
            }
        } else if ($relateduserid) {
            $user = \core_user::get_user($relateduserid);
            $a = ['count' => $count, 'name' => fullname($user)];
            $subject = get_string('noteforuser', 'local_notebook', $a);
        } else {
            $a = ['count' => $count];
            $subject = get_string('noteforsite', 'local_notebook', $a);
        }
        return $subject;
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

    /**
     * Count note by criteria.
     *
     * @param int $userid The user ID
     * @param int $courseid The course ID
     * @param int $coursemoduleid The course module ID
     * @return int the count
     */
    public static function count_notes($userid, $courseid, $coursemoduleid) {
        global $USER, $DB;
        $params = ['usermodified' => $USER->id,
            'module' => \local_notebook\post::MODULE,
            'publishstate' => \local_notebook\post::PUBLISHSTATE
        ];
        if ($userid) {
            $params['userid'] = $userid;
        } else if ($coursemoduleid) {
            $params['coursemoduleid'] = $coursemoduleid;
        } else if ($userid == 0 && $coursemoduleid == 0 && $courseid != 0) {
            $params['courseid'] = $courseid;
        } else {
            // Site.
            $params['userid'] = 0;
            $params['coursemoduleid'] = 0;
            $params['courseid'] = 0;

        }
        return \local_notebook\post::count_records($params);
    }
}
