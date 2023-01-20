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
 * Mandatory public API of Notebook plugin.
 *
 * @package    local_notebook
 * @copyright  2021 Université de Montréal
 * @author     Mélissa De Cristofaro <melissa.de.cristofaro@umontreal.ca>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

use tool_usertours\helper;

/**
 * The standard HTML that should be output just before the <footer> tag.
 * Designed to be called in theme layout.php files.
 * @return string HTML
 */
function local_notebook_standard_after_main_region_html() {
    global $PAGE;
    if (strpos($PAGE->url->get_path(), "/local/notebook/index.php") === false) {
        return  \local_notebook\helper::render_notebook_drawer($PAGE);
    }
}

/**
 * The standard tags (typically skip links) that should be output just inside
 * the start of the <body> tag.
 *
 * @return string HTML
 */
function local_notebook_before_standard_top_of_body_html() {
    global $PAGE;
    if (strpos($PAGE->url->get_path(), "/local/notebook/index.php") === false) {
        return  \local_notebook\helper::render_notebook_button();
    }
}

/**
 * Extend navigation.
 *
 * @param global_navigation $nav
 * @throws coding_exception
 * @throws moodle_exception
 */
function local_notebook_extend_navigation(global_navigation $nav) {
    global $USER, $PAGE;
    if(!isloggedin()) {
        return;
    }
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

    $url = new moodle_url('/local/notebook/index.php');
    $title = get_string('pluginname', 'local_notebook');
    $pix = new pix_icon('icon', $title, 'local_notebook');

    if ($courseid === 0 && $coursemoduleid == 0) {
        if ($relateduserid !== 0) {
            $url->param('userid', $relateduserid);
        }
        $childnode = navigation_node::create(
            $title,
            $url,
            navigation_node::TYPE_CUSTOM,
            'notebook',
            'notebook',
            $pix
        );
        $noderoot = $nav->find('site', navigation_node::TYPE_ROOTNODE);
        $node = $noderoot->add_node($childnode, 'privatefiles');
        $node->nodetype = navigation_node::NODETYPE_LEAF;
        $node->showinflatnavigation = true;
        $node->add_class('notebook');
    } else {
        $context = context_course::instance($PAGE->course->id);

        $rootnodes = array($nav->find('mycourses', navigation_node::TYPE_ROOTNODE),
                       $nav->find('courses', navigation_node::TYPE_ROOTNODE));
        foreach ($rootnodes as $rootnode) {
            if (empty($rootnode)) {
                continue;
            }

            $coursenode = $rootnode->find($PAGE->course->id, navigation_node::TYPE_COURSE);
            if ($coursenode == false) {
                continue;
            }
            $url->param('courseid', $PAGE->course->id);
            if ($coursemoduleid !== 0) {
                $url->param('cmid', $coursemoduleid);
            }
            $beforekey = null;
            $gradesnode = $coursenode->find('grades', navigation_node::TYPE_SETTING);

            if ($gradesnode) {
                $keys = $gradesnode->parent->get_children_key_list();
                $igrades = array_search('grades', $keys);
                $icheckmark = array_search('checkmarkreport' . $PAGE->course->id, $keys);
                if ($icheckmark !== false) {
                    if (isset($keys[$icheckmark + 1])) {
                        $beforekey = $keys[$icheckmark + 1];
                    }
                } else if ($igrades !== false) {
                    if (isset($keys[$igrades + 1])) {
                        $beforekey = $keys[$igrades + 1];
                    }
                }
            }
            if ($beforekey == null) {
                $activitiesnode = $coursenode->find('activitiescategory', navigation_node::TYPE_CATEGORY);
                if ($activitiesnode == false) {
                    $custom = $coursenode->find_all_of_type(navigation_node::TYPE_CUSTOM);
                    $sections = $coursenode->find_all_of_type(navigation_node::TYPE_SECTION);
                    if (!empty($custom)) {
                        $first = reset($custom);
                        $beforekey = $first->key;
                    } else if (!empty($sections)) {
                        $first = reset($sections);
                        $beforekey = $first->key;
                    }
                } else {
                    $beforekey = 'activitiescategory';
                }
            }

            $childnode = navigation_node::create(
                $title,
                $url,
                navigation_node::TYPE_CUSTOM,
                'notebook',
                'notebook',
                $pix
            );
            $node = $coursenode->add_node($childnode, $beforekey);
            $node->nodetype = navigation_node::NODETYPE_LEAF;
            $node->collapse = true;
            $node->add_class('downloadcenterlink');
            break;
        }
    }
}

/**
 * The standard tags (meta tags, links to stylesheets and JavaScript, etc.)
 * that should be included in the <head> tag. Designed to be called in theme
 * layout.php files.
 *
 * @return string HTML fragment.
 */
function local_notebook_before_standard_html_head() {
    global $PAGE;
    $PAGE->requires->css('/local/notebook/styles/bootstrap-table.min.css');
}

/**
 * Map fontawesome icon with notebook.
 *
 * @return array
 */
function local_notebook_get_fontawesome_icon_map() {
    return [
        'local_notebook:icon' => 'fa-file',
    ];
}


