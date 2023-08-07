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
 * Notebook settings.
 *
 * @package    local_notebook
 * @copyright  Catalyst IT Canada 2023
 * @author     Ghaly Marc-Alexandre <marc-alexandreghaly@catalyst-ca.net>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
namespace local_notebook\plugininfo;

use core\plugininfo\local;

/**
 * Plugin info class for logging store plugins.
 */
class notebook extends local {
    /**
     * Returns whether notebook is enabled or not.
     */
    public function is_enabled() {
        $enabled = (int) get_config('local_notebook', 'enabled') === 1 ? false : true;
        return $enabled;
    }

    /**
     * Returns whether notebook is enabled or not on all quiz instances.
     * @return bool true if enabled, false if not
     */
    public function is_enabled_quiz_attempt() {
        return ((int) get_config('local_notebook', 'enabledquizattempt')) === 1 ? false : true;
    }
}
