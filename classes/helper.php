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
defined('MOODLE_INTERNAL') || die();

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
     * Display notebook button in current page.
     */
    public static function bootstrap() {
        global $PAGE;

        if (!isloggedin() || isguestuser()) {
            return;
        }

        if (in_array($PAGE->pagelayout, ['maintenance', 'embedded', 'secure', 'print', 'redirect'])) {
            // Do not try to show the button in (maintenance/secure/embedded) mode,
            // when printing, or during redirects.
            return;
        }

        $PAGE->requires->js_call_amd('local_notebook/notebook', 'init', []);
    }

}
