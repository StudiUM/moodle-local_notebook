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

namespace local_notebook;
defined('MOODLE_INTERNAL') || die();
global $CFG;

use local_notebook\api;
use local_notebook\helper;
use moodle_exception;

/**
 * Notebook access testcase.
 *
 * @package    local_notebook
 * @copyright  2021 Université de Montréal
 * @author     Issam Taboubi <issam.taboubi@umontreal.ca>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class access_test extends \advanced_testcase {

    /**
     * Tests if notebook can be disabled.
     *
     * @covers \local_notebook\helper::has_to_display_notebook
     */
    public function test_disable_notebook() {
        $this->resetAfterTest(true);
        $this->assertTrue(set_config('enabled', 1, 'local_notebook'));
        $this->assert_cannot_access();
    }

    /**
     * Tests if not logged in user can access notebook.
     *
     * @covers \local_notebook\helper::has_to_display_notebook
     */
    public function test_not_logged_in_can_use_notebook() {
        $this->resetAfterTest(true);
        $this->setUser();
        $this->assert_cannot_access();
    }

    /**
     * Tests if guest user can access notebook.
     *
     * @covers \local_notebook\helper::has_to_display_notebook
     */
    public function test_guest_user_can_use_notebook() {
        $this->resetAfterTest(true);
        $this->setGuestUser();
        $this->assert_cannot_access();
    }

    /**
     * Test if on secure page can access notebook.
     *
     * @covers \local_notebook\helper::has_to_display_notebook
     */
    public function test_secure_page_can_use_notebook() {
        $this->resetAfterTest(true);
        global $PAGE;
        // Test with secure page.
        $PAGE->set_pagelayout('secure');
        $this->assert_cannot_access();
    }

    /**
     * Test if maintenance page can access notebook.
     *
     * @covers \local_notebook\helper::has_to_display_notebook
     */
    public function test_maintenance_page_can_use_notebook() {
        $this->resetAfterTest(true);
        global $PAGE;
        // Set admin user.
        $this->setAdminUser();

        // Test with maintenance page.
        $PAGE->set_pagelayout('maintenance');
        $this->assert_cannot_access();
    }

    /**
     * Test if standard page can access notebook.
     *
     * @covers \local_notebook\helper::has_to_display_notebook
     */
    public function test_standard_page_can_use_notebook() {
        $this->resetAfterTest(true);
        global $PAGE;
        // Set admin user.
        $this->setAdminUser();

        // Test with standard.
        $PAGE->set_pagelayout('standard');
        $this->assertTrue(helper::has_to_display_notebook());
    }

    /**
     * Assert can not access to the notebook.
     *
     * @covers \local_notebook\helper::has_to_display_notebook
     */
    protected function assert_cannot_access() {
        $this->expectException(moodle_exception::class);
        $this->expectExceptionMessage("You cannot use the notebook on this page.");
        api::can_use_notebook();
        $this->assertFalse(helper::has_to_display_notebook());
    }
}
