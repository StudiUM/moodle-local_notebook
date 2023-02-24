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
 * External tests.
 *
 * @package    local_notebook
 * @copyright  2021 Université de Montréal
 * @author     Issam Taboubi <issam.taboubi@umontreal.ca>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
namespace local_notebook;
defined('MOODLE_INTERNAL') || die();
global $CFG;

require_once($CFG->dirroot . '/webservice/tests/helpers.php');

use local_notebook\external;
use local_notebook\local_notebook_posts;

/**
 * External testcase.
 *
 * @package    local_notebook
 * @copyright  2021 Université de Montréal
 * @author     Issam Taboubi <issam.taboubi@umontreal.ca>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class external_test extends \externallib_advanced_testcase {

    /** @var stdClass $user User */
    protected $user = null;

    /** @var stdClass $student student */
    protected $student = null;

    /** @var stdClass $student2 student */
    protected $student2 = null;

    /** @var stdClass $course course */
    protected $course = null;

    /** @var stdClass $course course2 */
    protected $course2 = null;

    /** @var stdClass $cm course module */
    protected $cm = null;

    /** @var stdClass $cm2 course module */
    protected $cm2 = null;

    /** @var stdClass $cm3 course module */
    protected $cm3 = null;

    /**
     * Setup function.
     */
    protected function setUp(): void {
        global $DB, $CFG;

        $this->resetAfterTest(true);

        // Create courses and students in these courses.
        $this->user = $this->getDataGenerator()->create_user();
        $this->student = $this->getDataGenerator()->create_user();
        $this->student2 = $this->getDataGenerator()->create_user();
        $this->course = $this->getDataGenerator()->create_course();
        $this->course2 = $this->getDataGenerator()->create_course();
        $studentrole = $DB->get_record('role', array('shortname' => 'student'));
        $this->getDataGenerator()->enrol_user($this->student->id, $this->course->id, $studentrole->id);
        $this->getDataGenerator()->enrol_user($this->student2->id, $this->course->id, $studentrole->id);
        $this->getDataGenerator()->enrol_user($this->student->id, $this->course2->id, $studentrole->id);

        $quizgenerator = $this->getDataGenerator()->get_plugin_generator('mod_quiz');
        $quiz = $quizgenerator->create_instance(array('course' => $this->course->id));
        $this->cm = get_coursemodule_from_instance('quiz', $quiz->id, $this->course->id);
        $quiz = $quizgenerator->create_instance(array('course' => $this->course->id));
        $this->cm2 = get_coursemodule_from_instance('quiz', $quiz->id, $this->course->id);
        $quiz = $quizgenerator->create_instance(array('course' => $this->course2->id));
        $this->cm3 = get_coursemodule_from_instance('quiz', $quiz->id, $this->course2->id);
    }

    /**
     * Test add note external function with empty note.
     */
    public function test_add_note_with_empty_note() {
        $this->setUser($this->student);
        // Test with empty note.
        $this->expectExceptionMessage('The note cannot be empty.');
        $result = external::add_note(null, null, 0, 0, 0);
    }

    /**
     * Test add note external function with empty subject.
     */
    public function test_add_note_with_empty_subject() {
        $this->setUser($this->student);
        // Test with empty subject.
        $this->expectExceptionMessage('The subject cannot be empty.');
        $result = external::add_note('<p>My note</p>', null, 0, 0, 0);
    }

    /**
     * Test add note external function with user not belonging to course.
     */
    public function test_add_note_with_user_not_belong_to_course() {
        $this->setUser($this->student);
        // Test with user not enrolled in the course.
        $this->expectExceptionMessage('The user is not enrolled in the course.');
        $result = external::add_note('<p>My note</p>', 'My subject', $this->user->id, $this->course->id, 0);
    }

    /**
     * Test add note external function with course module not belonging to course.
     */
    public function test_add_note_with_cm_not_belong_to_course() {
        $this->setUser($this->student);
        // Test with course module not belonging to course.
        $this->expectExceptionMessage('The course given is different from the course of course module.');
        $result = external::add_note('<p>My note</p>', 'My subject', 0, $this->course2->id, $this->cm->id);
    }

    /**
     * Test add note external function with user having no access to the course module.
     */
    public function test_add_note_with_user_having_no_access_to_cm() {
        $this->setUser($this->user);
        // Test with user having no access to the course module.
        $this->expectExceptionMessage('The user cannot access to the course module.');
        $result = external::add_note('<p>My note</p>', 'My subject', 0, $this->course->id, $this->cm->id);
    }

    /**
     * Test add note external function.
     */
    public function test_add_note() {
        $this->setUser($this->student);
        // Test add note in site level.
        // Trigger and capture the event.
        $sink = $this->redirectEvents();
        $result = external::add_note('<p>My note</p>', 'My subject', 0, 0, 0);
        $this->assertNotEmpty($result);
        $note = new local_notebook_posts($result);
        $this->assertEquals(0, $note->get('userid'));
        $this->assertEquals(0, $note->get('courseid'));
        $this->assertEquals(0, $note->get('coursemoduleid'));
        $this->assertEquals('My subject', $note->get('subject'));
        $this->assertEquals('<p>My note</p>', $note->get('summary'));
        // Get our event.
        $events = $sink->get_events();
        $event = reset($events);
        $this->assertEquals('\local_notebook\event\notebook_created', $event->eventname);
        $expmsg = "The user with id '".$this->student->id."' created the note with id '".$note->get('id')."'.";
        $this->assertEquals($expmsg, $event->get_description());
        $this->assertEquals($this->student->id, $event->userid);
        $this->assertEquals(0, $event->relateduserid);
        $this->assertEquals(0, $event->other['cmid']);
        $this->assertEquals(0, $event->other['courseid']);

        // Test add note for user in site level.
        // Trigger and capture the event.
        $sink = $this->redirectEvents();
        $result = external::add_note('<p>My note for user</p>', 'My subject for user', $this->user->id, 0, 0);
        $this->assertNotEmpty($result);
        $note = new local_notebook_posts($result);
        $this->assertEquals($this->user->id, $note->get('userid'));
        $this->assertEquals(0, $note->get('courseid'));
        $this->assertEquals(0, $note->get('coursemoduleid'));
        $this->assertEquals('My subject for user', $note->get('subject'));
        $this->assertEquals('<p>My note for user</p>', $note->get('summary'));
        // Get our event.
        $events = $sink->get_events();
        $event = reset($events);
        $this->assertEquals('\local_notebook\event\notebook_created', $event->eventname);
        $expmsg = "The user with id '".$this->student->id."' created the note with id '".$note->get('id')."'";
        $expmsg .= " for the user with id '".$this->user->id."'.";
        $this->assertEquals($expmsg, $event->get_description());
        $this->assertEquals($this->student->id, $event->userid);
        $this->assertEquals($this->user->id, $event->relateduserid);
        $this->assertEquals(0, $event->other['cmid']);
        $this->assertEquals(0, $event->other['courseid']);

        // Test add note for user in course level.
        // Trigger and capture the event.
        $sink = $this->redirectEvents();
        $result = external::add_note('<p>My note for user in course</p>', 'My subject for user in course',
            $this->student2->id, $this->course->id, 0);
        $this->assertNotEmpty($result);
        $note = new local_notebook_posts($result);
        $this->assertEquals($this->student2->id, $note->get('userid'));
        $this->assertEquals($this->course->id, $note->get('courseid'));
        $this->assertEquals(0, $note->get('coursemoduleid'));
        $this->assertEquals('My subject for user in course', $note->get('subject'));
        $this->assertEquals('<p>My note for user in course</p>', $note->get('summary'));
        // Get our event.
        $events = $sink->get_events();
        $event = reset($events);
        $this->assertEquals('\local_notebook\event\notebook_created', $event->eventname);
        $expmsg = "The user with id '".$this->student->id."' created the note with id '".$note->get('id')."'";
        $expmsg .= " for the user with id '".$this->student2->id."'";
        $expmsg .= " in the course with id '" .$this->course->id. "'.";
        $this->assertEquals($expmsg, $event->get_description());
        $this->assertEquals($this->student->id, $event->userid);
        $this->assertEquals($this->student2->id, $event->relateduserid);
        $this->assertEquals(0, $event->other['cmid']);
        $this->assertEquals($this->course->id, $event->other['courseid']);

        // Test add note in the course.
        // Trigger and capture the event.
        $sink = $this->redirectEvents();
        $result = external::add_note('<p>My note in course</p>', 'My subject in course', 0, $this->course->id, 0);
        $this->assertNotEmpty($result);
        $note = new local_notebook_posts($result);
        $this->assertEquals(0, $note->get('userid'));
        $this->assertEquals($this->course->id, $note->get('courseid'));
        $this->assertEquals(0, $note->get('coursemoduleid'));
        $this->assertEquals('My subject in course', $note->get('subject'));
        $this->assertEquals('<p>My note in course</p>', $note->get('summary'));
        // Get our event.
        $events = $sink->get_events();
        $event = reset($events);
        $this->assertEquals('\local_notebook\event\notebook_created', $event->eventname);
        $expmsg = "The user with id '".$this->student->id."' created the note with id '".$note->get('id')."'";
        $expmsg .= " in the course with id '" .$this->course->id. "'.";
        $this->assertEquals($expmsg, $event->get_description());
        $this->assertEquals($this->student->id, $event->userid);
        $this->assertEquals(0, $event->relateduserid);
        $this->assertEquals(0, $event->other['cmid']);
        $this->assertEquals($this->course->id, $event->other['courseid']);

        // Test add note in the course module.
        // Trigger and capture the event.
        $sink = $this->redirectEvents();
        $result = external::add_note('<p>My note in course module</p>', 'My subject in course module', 0,
            $this->course->id, $this->cm->id);
        $this->assertNotEmpty($result);
        $note = new local_notebook_posts($result);
        $this->assertEquals(0, $note->get('userid'));
        $this->assertEquals($this->course->id, $note->get('courseid'));
        $this->assertEquals($this->cm->id, $note->get('coursemoduleid'));
        $this->assertEquals('My subject in course module', $note->get('subject'));
        $this->assertEquals('<p>My note in course module</p>', $note->get('summary'));
        // Get our event.
        $events = $sink->get_events();
        $event = reset($events);
        $this->assertEquals('\local_notebook\event\notebook_created', $event->eventname);
        $expmsg = "The user with id '".$this->student->id."' created the note with id '".$note->get('id')."'";
        $expmsg .= " for the course module with id '" .$this->cm->id. "'";
        $expmsg .= " in the course with id '" .$this->course->id. "'.";
        $this->assertEquals($expmsg, $event->get_description());
        $this->assertEquals($this->student->id, $event->userid);
        $this->assertEquals(0, $event->relateduserid);
        $this->assertEquals($this->cm->id, $event->other['cmid']);
        $this->assertEquals($this->course->id, $event->other['courseid']);
    }

    /**
     * Test update note external function with user having no access to the note.
     */
    public function test_update_note_with_user_having_no_access_to_note() {
        $this->setUser($this->user);

        $result = external::add_note('<p>My note</p>', 'My subject', 0, 0, 0);
        // Login with another user.
        $this->setUser($this->student);
        $this->expectExceptionMessage('The user cannot update the note.');
        $result = external::update_note($result, '<p>My note updated</p>', 'My subject updated');
    }

    /**
     * Test update note external function with unfound note.
     */
    public function test_update_note_with_note_not_found() {
        $this->setUser($this->user);

        $result = external::add_note('<p>My note</p>', 'My subject', 0, 0, 0);
        // Login with another user.
        $this->setUser($this->student);
        $this->expectExceptionMessage("Can't find data record in database table local_notebook_posts");
        $result = external::update_note(585, '<p>My note updated</p>', 'My subject updated');
    }

    /**
     * Test update note external function.
     */
    public function test_update_note() {
        $this->setUser($this->student);

        $result = external::add_note('<p>My note</p>', 'My subject', 0, 0, 0);

        // Trigger and capture the event.
        $sink = $this->redirectEvents();
        $updated = external::update_note($result, '<p>My note updated</p>', 'My subject updated');
        $this->assertNotEmpty($result);
        $note = new local_notebook_posts($result);
        $this->assertEquals(0, $note->get('userid'));
        $this->assertEquals(0, $note->get('courseid'));
        $this->assertEquals(0, $note->get('coursemoduleid'));
        $this->assertEquals('My subject updated', $note->get('subject'));
        $this->assertEquals('<p>My note updated</p>', $note->get('summary'));
        // Get our event.
        $events = $sink->get_events();
        $event = reset($events);
        $this->assertEquals('\local_notebook\event\notebook_updated', $event->eventname);
        $expmsg = "The user with id '".$this->student->id."' updated the note with id '".$note->get('id')."'.";
        $this->assertEquals($expmsg, $event->get_description());
        $this->assertEquals($this->student->id, $event->userid);
        $this->assertEquals(0, $event->relateduserid);
        $this->assertEquals(0, $event->other['cmid']);
        $this->assertEquals(0, $event->other['courseid']);
    }

    /**
     * Test delete note external function with user having no access to the note.
     */
    public function test_delete_note_with_user_having_no_access_to_note() {
        $this->setUser($this->user);

        $result = external::add_note('<p>My note</p>', 'My subject', 0, 0, 0);
        // Login with another user.
        $this->setUser($this->student);
        $this->expectExceptionMessage('The user cannot delete the note.');
        $result = external::delete_notes([$result]);
    }

    /**
     * Test delete note external function with unfound note.
     */
    public function test_delete_note_with_note_not_found() {
        $this->setUser($this->user);

        $result = external::add_note('<p>My note</p>', 'My subject', 0, 0, 0);
        // Login with another user.
        $this->setUser($this->student);
        $this->expectExceptionMessage("Can't find data record in database table local_notebook_posts");
        $result = external::delete_notes([585]);
    }

    /**
     * Test delete notes external function.
     */
    public function test_delete_notes() {
        $this->setUser($this->student);

        $noteid = external::add_note('<p>My note</p>', 'My subject', 0, 0, 0);
        $noteid2 = external::add_note('<p>My note2</p>', 'My subject2', 0, 0, 0);

        // Trigger and capture the events.
        $sink = $this->redirectEvents();
        $updated = external::delete_notes([$noteid, $noteid2]);
        $this->assertEquals(true, $updated);

        // Get our events event.
        $events = $sink->get_events();
        $this->assertCount(2, $events);
        $event = reset($events);
        $this->assertEquals('\local_notebook\event\notebook_deleted', $event->eventname);
        $expmsg = "The user with id '".$this->student->id."' deleted the note with id '".$noteid."'.";
        $event = reset($events);
        $this->assertEquals('\local_notebook\event\notebook_deleted', $event->eventname);
        $expmsg = "The user with id '".$this->student->id."' deleted the note with id '".$noteid2."'.";

        try {
            $note1 = new local_notebook_posts($noteid);
            $note2 = new local_notebook_posts($noteid2);
            $this->fail('The notes are not deleted');
        } catch (\Exception $e) {
            // All is good.
            $this->assertTrue(true);
        }
    }

    /**
     * Test read note external function.
     */
    public function test_read_note() {
        $this->setUser($this->student);
        // Test add note in site level.
        $noteid = external::add_note('<p>My note</p>', 'My subject', 0, 0, 0);
        $result = external::read_note($noteid);
        $result = (object) \external_api::clean_returnvalue(external::read_note_returns(), $result);
        $this->assertEquals(get_string('site'), $result->contextname);
        $this->assertEquals($noteid, $result->id);
        $this->assertEquals(0, $result->userid);
        $this->assertEquals(0, $result->courseid);
        $this->assertEquals(0, $result->coursemoduleid);
        $this->assertEquals('<p>My note</p>', $result->summary);
        $this->assertEquals('My subject', $result->subject);
        $this->assertCount(0, $result->tags);

        // Test add note for user in site level.
        $noteid = external::add_note('<p>My note for user</p>', 'My subject for user', $this->user->id, 0, 0);
        $result = external::read_note($noteid);
        $result = (object) \external_api::clean_returnvalue(external::read_note_returns(), $result);
        $this->assertEquals(get_string('profile'), $result->contextname);
        $this->assertEquals($noteid, $result->id);
        $this->assertEquals($this->user->id, $result->userid);
        $this->assertEquals(0, $result->courseid);
        $this->assertEquals(0, $result->coursemoduleid);
        $this->assertEquals('<p>My note for user</p>', $result->summary);
        $this->assertEquals('My subject for user', $result->subject);
        $this->assertCount(1, $result->tags);
        $this->assertEquals('https://www.example.com/moodle/user/profile.php?id='.$this->user->id, $result->tags[0]['url']);
        $this->assertEquals(fullname($this->user), $result->tags[0]['title']);

        // Test add note for user in course level.
        // Trigger and capture the event.

        $noteid = external::add_note('<p>My note for user in course</p>', 'My subject for user in course',
            $this->student2->id, $this->course->id, 0);
        $result = external::read_note($noteid);
        $result = (object) \external_api::clean_returnvalue(external::read_note_returns(), $result);
        $this->assertEquals(get_string('profile'), $result->contextname);
        $this->assertEquals($this->student2->id, $result->userid);
        $this->assertEquals($noteid, $result->id);
        $this->assertEquals($this->course->id, $result->courseid);
        $this->assertEquals(0, $result->coursemoduleid);
        $this->assertEquals('<p>My note for user in course</p>', $result->summary);
        $this->assertEquals('My subject for user in course', $result->subject);
        $this->assertCount(2, $result->tags);
        $this->assertEquals('https://www.example.com/moodle/user/profile.php?id='.$this->student2->id, $result->tags[1]['url']);
        $this->assertEquals(fullname($this->student2), $result->tags[1]['title']);
        $this->assertEquals('https://www.example.com/moodle/course/view.php?id='.$this->course->id, $result->tags[0]['url']);
        $this->assertEquals($this->course->shortname, $result->tags[0]['title']);

        // Test add note in the course.
        $noteid = external::add_note('<p>My note in course</p>', 'My subject in course', 0, $this->course->id, 0);
        $result = external::read_note($noteid);
        $result = (object) \external_api::clean_returnvalue(external::read_note_returns(), $result);
        $this->assertEquals(get_string('course'), $result->contextname);
        $this->assertEquals(0, $result->userid);
        $this->assertEquals($noteid, $result->id);
        $this->assertEquals($this->course->id, $result->courseid);
        $this->assertEquals(0, $result->coursemoduleid);
        $this->assertEquals('<p>My note in course</p>', $result->summary);
        $this->assertEquals('My subject in course', $result->subject);
        $this->assertCount(1, $result->tags);
        $this->assertEquals('https://www.example.com/moodle/course/view.php?id='.$this->course->id, $result->tags[0]['url']);
        $this->assertEquals($this->course->shortname, $result->tags[0]['title']);

        // Test add note in the course module.
        $noteid = external::add_note('<p>My note in course module</p>', 'My subject in course module', 0,
            $this->course->id, $this->cm->id);
        $result = external::read_note($noteid);
        $result = (object) \external_api::clean_returnvalue(external::read_note_returns(), $result);
        $this->assertEquals(get_string('activity'), $result->contextname);
        $this->assertEquals(0, $result->userid);
        $this->assertEquals($noteid, $result->id);
        $this->assertEquals($this->course->id, $result->courseid);
        $this->assertEquals($this->cm->id, $result->coursemoduleid);
        $this->assertEquals('<p>My note in course module</p>', $result->summary);
        $this->assertEquals('My subject in course module', $result->subject);
        $this->assertCount(2, $result->tags);
        $this->assertEquals('https://www.example.com/moodle/course/view.php?id='.$this->course->id, $result->tags[0]['url']);
        $this->assertEquals($this->course->shortname, $result->tags[0]['title']);
        $this->assertEquals('https://www.example.com/moodle/mod/quiz/view.php?id='.$this->cm->id, $result->tags[1]['url']);
        $this->assertEquals($this->cm->name, $result->tags[1]['title']);
    }

    /**
     * Test notes list external function.
     */
    public function test_notes_list() {
        $this->setUser($this->student);
        // Test add note in site level.
        $noteid1 = external::add_note('<p>My note</p>', 'My subject', 0, 0, 0);

        // Test add note for user in site level.
        $noteid2 = external::add_note('<p>My note for user</p>', 'My subject for user', $this->user->id, 0, 0);
        $noteid3 = external::add_note('<p>My note for user</p>', 'My subject for user', $this->student2->id, 0, 0);

        // Test add note for user in course level.
        $noteid4 = external::add_note('<p>My note for user in course</p>', 'My subject for user in course',
            $this->student2->id, $this->course->id, 0);
        // Test add note in the course.
        $noteid5 = external::add_note('<p>My note in course</p>', 'My subject in course', 0, $this->course->id, 0);
        $noteid6 = external::add_note('<p>My note in course</p>', 'My subject in course', 0, $this->course2->id, 0);

        // Test add note in the course module.
        $noteid7 = external::add_note('<p>My note in course module</p>', 'My subject in course module', 0,
            $this->course->id, $this->cm->id);
        $noteid8 = external::add_note('<p>My note in course module</p>', 'My subject in course module', 0,
            $this->course2->id, $this->cm3->id);

        $this->setUser($this->student2);
        // Test add note in site level.
        $noteid9 = external::add_note('<p>My note</p>', 'My subject', 0, 0, 0);
        // Login with student.
        // Get notes in site level.
        $this->setUser($this->student);
        $result = external::notes_list(0, 0, 0);
        $result = \external_api::clean_returnvalue(external::notes_list_returns(), $result);
        $this->assertCount(8, $result);
        $r1 = $result[0];
        $this->assertEquals($noteid1, $r1['id']);
        $r2 = $result[1];
        $this->assertEquals($noteid8, $r2['id']);
        $r3 = $result[2];
        $this->assertEquals($noteid7, $r3['id']);
        $r4 = $result[3];
        $this->assertEquals($noteid6, $r4['id']);
        $r5 = $result[4];
        $this->assertEquals($noteid5, $r5['id']);
        $r6 = $result[5];
        $this->assertEquals($noteid4, $r6['id']);
        $r7 = $result[6];
        $this->assertEquals($noteid3, $r7['id']);
        $r8 = $result[7];
        $this->assertEquals($noteid2, $r8['id']);

        // Test for user in site level.
        $result = external::notes_list($this->user->id, 0, 0);
        $result = \external_api::clean_returnvalue(external::notes_list_returns(), $result);
        $this->assertCount(8, $result);
        $r1 = $result[0];
        $this->assertEquals($noteid2, $r1['id']);
        $r2 = $result[1];
        $this->assertEquals($noteid4, $r2['id']);
        $r3 = $result[2];
        $this->assertEquals($noteid3, $r3['id']);
        $r4 = $result[3];
        $this->assertEquals($noteid8, $r4['id']);
        $r5 = $result[4];
        $this->assertEquals($noteid7, $r5['id']);
        $r6 = $result[5];
        $this->assertEquals($noteid6, $r6['id']);
        $r7 = $result[6];
        $this->assertEquals($noteid5, $r7['id']);
        $r8 = $result[7];
        $this->assertEquals($noteid1, $r8['id']);

        // Test for user in course.
        $result = external::notes_list($this->student2->id, $this->course->id, 0);
        $result = \external_api::clean_returnvalue(external::notes_list_returns(), $result);
        $this->assertCount(8, $result);
        $r1 = $result[0];
        $this->assertEquals($noteid4, $r1['id']);
        $r2 = $result[1];
        $this->assertEquals($noteid3, $r2['id']);
        $r3 = $result[2];
        $this->assertEquals($noteid2, $r3['id']);
        $r4 = $result[3];
        $this->assertEquals($noteid8, $r4['id']);
        $r5 = $result[4];
        $this->assertEquals($noteid7, $r5['id']);
        $r6 = $result[5];
        $this->assertEquals($noteid6, $r6['id']);
        $r7 = $result[6];
        $this->assertEquals($noteid5, $r7['id']);
        $r8 = $result[7];
        $this->assertEquals($noteid1, $r8['id']);

        // If no note found for user in site level, so find other users DESC.
        $result = external::notes_list($this->student->id, 0, 0);
        $result = \external_api::clean_returnvalue(external::notes_list_returns(), $result);
        $this->assertCount(8, $result);
        $r1 = $result[0];
        $this->assertEquals($noteid4, $r1['id']);
        $r2 = $result[1];
        $this->assertEquals($noteid3, $r2['id']);
        $r3 = $result[2];
        $this->assertEquals($noteid2, $r3['id']);
        $r4 = $result[3];
        $this->assertEquals($noteid8, $r4['id']);
        $r5 = $result[4];
        $this->assertEquals($noteid7, $r5['id']);
        $r6 = $result[5];
        $this->assertEquals($noteid6, $r6['id']);
        $r7 = $result[6];
        $this->assertEquals($noteid5, $r7['id']);
        $r8 = $result[7];
        $this->assertEquals($noteid1, $r8['id']);

        // Test note in the course, find the notes in course and then in others courses.
        $result = external::notes_list(0, $this->course->id, 0);
        $result = \external_api::clean_returnvalue(external::notes_list_returns(), $result);
        $this->assertCount(8, $result);
        $r1 = $result[0];
        $this->assertEquals($noteid5, $r1['id']);
        $r2 = $result[1];
        $this->assertEquals($noteid7, $r2['id']);
        $r3 = $result[2];
        $this->assertEquals($noteid4, $r3['id']);
        $r4 = $result[3];
        $this->assertEquals($noteid8, $r4['id']);
        $r5 = $result[4];
        $this->assertEquals($noteid6, $r5['id']);
        $r6 = $result[5];
        $this->assertEquals($noteid3, $r6['id']);
        $r7 = $result[6];
        $this->assertEquals($noteid2, $r7['id']);
        $r8 = $result[7];
        $this->assertEquals($noteid1, $r8['id']);

        // Test note in the course module, find the notes in course module.
        // Then the course modules in the same course.
        // Then the other course modules in other courses.
        $result = external::notes_list(0, 0, $this->cm->id);
        $result = \external_api::clean_returnvalue(external::notes_list_returns(), $result);
        $this->assertCount(8, $result);
        $r1 = $result[0];
        $this->assertEquals($noteid7, $r1['id']);
        $r2 = $result[1];
        $this->assertEquals($noteid5, $r2['id']);
        $r3 = $result[2];
        $this->assertEquals($noteid4, $r3['id']);
        $r4 = $result[3];
        $this->assertEquals($noteid8, $r4['id']);
        $r5 = $result[4];
        $this->assertEquals($noteid6, $r5['id']);
        $r6 = $result[5];
        $this->assertEquals($noteid3, $r6['id']);
        $r7 = $result[6];
        $this->assertEquals($noteid2, $r7['id']);
        $r8 = $result[7];
        $this->assertEquals($noteid1, $r8['id']);

        // Get notes for course module cm3.
        $result = external::notes_list(0, 0, $this->cm3->id);
        $result = \external_api::clean_returnvalue(external::notes_list_returns(), $result);
        $this->assertCount(8, $result);
        $r1 = $result[0];
        $this->assertEquals($noteid8, $r1['id']);
        $r2 = $result[1];
        $this->assertEquals($noteid6, $r2['id']);
        $r3 = $result[2];
        $this->assertEquals($noteid7, $r3['id']);
        $r4 = $result[3];
        $this->assertEquals($noteid5, $r4['id']);
        $r5 = $result[4];
        $this->assertEquals($noteid4, $r5['id']);
        $r6 = $result[5];
        $this->assertEquals($noteid3, $r6['id']);
        $r7 = $result[6];
        $this->assertEquals($noteid2, $r7['id']);
        $r8 = $result[7];
        $this->assertEquals($noteid1, $r8['id']);
    }
}
