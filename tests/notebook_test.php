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

namespace local_notebook;

use \local_notebook\api;
use context_course;

/**
 * Notebook notes testcase.
 *
 * @package    local_notebook
 * @copyright  Catalyst IT Canada 2023
 * @author     Ghaly Marc-Alexandre <marc-alexandreghaly@catalyst-ca.net>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class notebook_test extends \advanced_testcase {
    /**
     * Test a user can add and delete a note.
     *
     * @covers \local_notebook\api::add_note
     * @covers \local_notebook\api::delete_note
     */
    public function test_can_add_delete_note() {
        global $DB;
        $this->resetAfterTest(true);
        $this->user = $this->getDataGenerator()->create_user();
        $this->setUser($this->user);
        $this->course = $this->getDataGenerator()->create_course();
        $note = 'This is a test note';
        $subject = 'This is a note subject';
        $studentrole = $DB->get_record('role', ['shortname' => 'student']);
        $this->getDataGenerator()->enrol_user($this->user->id, $this->course->id, $studentrole->id);
        api::add_note($note, $subject, $this->user->id, $this->course->id, 0);
        $note = $DB->get_records(local_notebook_posts::TABLE);
        $this->assertCount(1, $note);
        api::delete_note(reset($note)->id);
        $note = $DB->get_records(local_notebook_posts::TABLE);
        $this->assertCount(0, $note);
    }

    /**
     * Make sure that when a note is deleted last instance name version
     * is retained in local_notebook_posts database.
     *
     * @covers \local_notebook\event::course_deleted_observer
     * @covers \local_notebook\event::course_updated_observer
     */
    public function test_course_observers() {
        global $DB;
        $this->resetAfterTest(true);
        $this->user = $this->getDataGenerator()->create_user();
        $this->setUser($this->user);
        $this->course = $this->getDataGenerator()->create_course(['shortname' => 'Initial']);
        $coursecontext = context_course::instance($this->course->id);
        $note = 'This is a test note';
        $subject = 'This is a note subject';
        $studentrole = $DB->get_record('role', ['shortname' => 'student']);
        $this->getDataGenerator()->enrol_user($this->user->id, $this->course->id, $studentrole->id);
        api::add_note($note, $subject, $this->user->id, $this->course->id, 0);
        $note = $DB->get_records(local_notebook_posts::TABLE);
        $this->assertEquals(reset($note)->courseid, $this->course->id);
        $this->assertEquals(reset($note)->coursename, 'Initial');
        $this->course->shortname = 'Newname';
        // Testing course_updated_observer is updating local_notebook_posts::TABLE as it should.
        // Event core\event\course_updated is triggered in the following function.
        update_course($this->course);
        $note = $DB->get_records(local_notebook_posts::TABLE);
        $course = $DB->get_record('course', ['id' => $this->course->id]);
        $this->assertEquals($course->shortname, 'Newname');
        $this->assertEquals(reset($note)->courseid, $this->course->id);
        // Testing course_deleted_observer is updating local_notebook_posts::TABLE as it should.
        // Trigger a course deleted event.
        // Function delete_course not used because of debugging messages (relativedatesmode).
        $deleted = $DB->delete_records('course', ['id' => $this->course->id]);
        $this->assertTrue($deleted);
        $event = \core\event\course_deleted::create([
            'objectid' => $course->id,
            'context' => $coursecontext,
            'other' => [
                'shortname' => $course->shortname,
                'fullname' => $course->fullname,
                'idnumber' => $course->idnumber,
            ]
        ]);
        $event->add_record_snapshot('course', $course);
        $event->trigger();
        $note = $DB->get_records(local_notebook_posts::TABLE);
        $this->assertEquals(reset($note)->courseid, 0);
        $this->assertEquals($course->shortname, 'Newname');
    }

    /**
     * Ensures that course modules are updated and last instance name is retained before deletion.
     *
     * @covers \local_notebook\event::course_module_deleted_observer
     * @covers \local_notebook\event::course_module_updated_observer
     */
    public function test_course_module_observers() {
        global $DB;
        $this->resetAfterTest(true);
        $this->user = $this->getDataGenerator()->create_user();
        $this->setUser($this->user);
        $this->course = $this->getDataGenerator()->create_course();
        $forum = $this->getDataGenerator()->create_module('forum', ['course' => $this->course->id, 'name' => 'Initialname']);
        $cm = get_coursemodule_from_instance('forum', $forum->id);
        $note = 'This is a test note';
        $subject = 'This is a note subject';
        $studentrole = $DB->get_record('role', ['shortname' => 'student']);
        $this->getDataGenerator()->enrol_user($this->user->id, $this->course->id, $studentrole->id);
        api::add_note($note, $subject, 0, $this->course->id, $cm->id);
        $note = $DB->get_records(local_notebook_posts::TABLE);
        $this->assertEquals(reset($note)->activityname, 'Initialname');
        $forum->name = 'Newname';
        // Module test values.
        $moduleinfo = (object) [
            'name' => 'Newname',
            'modulename' => 'forum',
            'section' => 1,
            'course' => $this->course->id,
            'coursemodule' => $cm->id,
            'introeditor' => [
                'itemid' => IGNORE_FILE_MERGE,
                'text' => 'Test',
                'format' => 1,
            ],
            'scale' => 0,
            'grade_forum' => 0,
            'cmidnumber' => 'idnumber',
            'type' => 'general',
            'forcesubscribe' => 0,
        ];
        // Triggers course_module_updated_observer.
        update_moduleinfo($cm, $moduleinfo, $this->course);
        $note = $DB->get_records(local_notebook_posts::TABLE);
        $this->assertEquals(reset($note)->activityname, 'Newname');
        $this->assertEquals(reset($note)->coursemoduleid, $cm->id);
        // Triggers course_module_deleted_observer.
        course_delete_module($cm->id);
        $note = $DB->get_records(local_notebook_posts::TABLE);
        $this->assertEquals(reset($note)->activityname, 'Newname');
        $this->assertEquals(reset($note)->coursemoduleid, 0);
    }
}
