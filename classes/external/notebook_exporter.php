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
 * Class for exporting note data.
 *
 * @package    local_notebook
 * @copyright  2021 Université de Montréal
 * @author     Issam Taboubi <issam.taboubi@umontreal.ca>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
namespace local_notebook\external;

use renderer_base;
use \local_notebook\local_notebook_posts;

/**
 * Class for exporting note data.
 *
 * @package    local_notebook
 * @copyright  2021 Université de Montréal
 * @author     Issam Taboubi <issam.taboubi@umontreal.ca>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class notebook_exporter extends \core\external\persistent_exporter {

    /**
     * Class definition.
     *
     * @return string
     */
    protected static function define_class() {
        return local_notebook_posts::class;
    }

    /**
     * Related objects definition.
     *
     * @return array
     */
    protected static function define_related() {
        return [
            'context' => 'context',
        ];
    }

    /**
     * Other properties definition.
     *
     * @return array
     */
    protected static function define_other_properties() {
        return [
            'contextname' => [
                'type' => PARAM_TEXT
            ],
            'tags' => [
                'type' => note_tag_exporter::read_properties_definition(),
                'multiple' => true
            ]
        ];
    }

    /**
     * Assign values to the defined other properties.
     *
     * @param renderer_base $output The output renderer object.
     * @return array
     * @throws coding_exception
     * @throws dml_exception
     * @throws moodle_exception
     */
    protected function get_other_values(renderer_base $output) {
        global $DB;
        $values = [];
        $tags = [];
        $values['contextname'] = get_string('site');
        if ($this->persistent->get('courseid') != 0 || !empty($this->persistent->get('coursename'))) {
            $values['contextname'] = get_string('course');
            $course = $DB->get_record('course', ['id' => $this->persistent->get('courseid')], '*', IGNORE_MISSING);
            $result = new \stdClass();
            if (!$course) {
                $coursename = $this->persistent->get('coursename');
                $result->url = '#';
                $result->title = $coursename;
                $result->tooltip = get_string('coursedeleted', 'local_notebook', $coursename);
            } else {
                $url = (new \moodle_url('/course/view.php',
                    ['id' => $course->id]))->out();
                $result->url = $url;
                $result->title = $course->shortname;
                $result->tooltip = get_string('gotocourse', 'local_notebook', $course->shortname);
            }
            $tags[] = $result;
        }
        if ($this->persistent->get('coursemoduleid') != 0 || !empty($this->persistent->get('activityname'))) {
            $values['contextname'] = get_string('activity');
            $cm = get_coursemodule_from_id('', $this->persistent->get('coursemoduleid'), 0, true, IGNORE_MISSING);
            $result = new \stdClass();
            // If no cm found, it means course module has been deleted, then get name from persistent table.
            if (!$cm) {
                $cmname = $this->persistent->get('activityname');
                $result->url = '#';
                $result->title = $cmname;
                $result->tooltip = get_string('activitydeleted', 'local_notebook', $cmname);
            } else {
                $modinfo = get_fast_modinfo($cm->course);
                $cm = $modinfo->instances[$cm->modname][$cm->instance];
                $result->url = $cm->url->out();
                $result->title = $cm->name;
                $result->tooltip = get_string('gotoactivity', 'local_notebook', $cm->name);
            }
            $tags[] = $result;
        }
        if ($this->persistent->get('userid') != 0) {
            $user = $DB->get_record('user', array('id' => $this->persistent->get('userid')), '*', MUST_EXIST);
            $values['contextname'] = get_string('profile');
            $profileurl = (new \moodle_url('/user/profile.php',
                array('id' => $user->id)))->out();
            $result = new \stdClass();
            $result->url = $profileurl;
            $result->title = fullname($user);
            $result->tooltip = get_string('gotoprofile', 'local_notebook', fullname($user));
            $tags[] = $result;
        }
        $values['tags'] = [];
        foreach ($tags as $tag) {
            $exporter = new \local_notebook\external\note_tag_exporter($tag);
            $values['tags'][] = $exporter->export($output);
        }
        return $values;
    }
}
