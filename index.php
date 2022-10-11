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
 * A page displaying the user's notes.
 *
 * @package    local_notebook
 * @copyright  2022 Université de Montréal
 * @author     Issam Taboubi <issam.taboubi@umontreal.ca>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once('../../config.php');

require_login(null, false);

$courseid = optional_param('courseid', 0, PARAM_INT);
$cmid = optional_param('cmid', 0, PARAM_INT);
$userid = optional_param('userid', 0, PARAM_INT);

$url = new moodle_url('/local/notebook/index.php');
if ($userid) {
    $url->param('userid', $userid);
}
if ($courseid) {
    $url->param('courseid', $courseid);
}
if ($cmid) {
    $url->param('cmid', $cmid);
}
$PAGE->set_context(\context_system::instance());
$title = get_string('pluginname', 'local_notebook');
$PAGE->set_url($url);
$PAGE->set_title($title);
$PAGE->set_heading($title);
echo $OUTPUT->header();
echo \local_notebook\helper::render_notebook_index($courseid, $cmid, $userid);
echo $OUTPUT->footer();
