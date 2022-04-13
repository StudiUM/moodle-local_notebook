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
 * Api tests.
 *
 * @package    local_notebook
 * @copyright  2022 Université de Montréal
 * @author     Issam Taboubi <issam.taboubi@umontreal.ca>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();
global $CFG;

use local_notebook\api;
use local_notebook\helper;

/**
 * Notebook access testcase.
 *
 * @package    local_notebook
 * @copyright  2021 Université de Montréal
 * @author     Issam Taboubi <issam.taboubi@umontreal.ca>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class local_notebook_access_testcase extends advanced_testcase {

    /**
     * Test if user can use notebook in some pages.
     */
    public function test_can_use_notebook() {
        global $PAGE;
        // Test user not logged in.
        $this->setUser();
        $this->assert_cannot_access();

        // Test guest user.
        $this->setGuestUser();
        $this->assert_cannot_access();

        // Test with secure page.
        $PAGE->set_pagelayout('secure');
        $this->assert_cannot_access();

        // Set admin user.
        $this->setAdminUser();

        // Test with maintenance page.
        $PAGE->set_pagelayout('maintenance');
        $this->assert_cannot_access();

        // Test with standard.
        $PAGE->set_pagelayout('standard');
        $this->assertTrue(helper::has_to_display_notebook());
    }
    /**
     * Assert can not access to the notebook.
     */
    protected function assert_cannot_access() {
        $this->assertFalse(helper::has_to_display_notebook());
        $this->expectException('moodle_exception');
        $this->expectExceptionMessage("You cannot use the notebook on this page.");
        api::can_use_notebook();
    }
}
