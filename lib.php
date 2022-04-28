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
    return  \local_notebook\helper::render_notebook_drawer($PAGE);
}

/**
 * The standard tags (typically skip links) that should be output just inside
 * the start of the <body> tag.
 *
 * @return string HTML
 */
function local_notebook_before_standard_top_of_body_html() {
    return  \local_notebook\helper::render_notebook_button();
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


