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
 * Note form.
 *
 * @package    local_notebook
 * @author     Issam Taboubi <issam.taboubi@umontreal.ca>
 * @copyright  2022 Université de Montréal
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
namespace local_notebook\form;

defined('MOODLE_INTERNAL') || die();

use moodleform;
use renderable;
require_once($CFG->libdir.'/formslib.php');

/**
 * Note form.
 *
 * @author     Issam Taboubi <issam.taboubi@umontreal.ca>
 * @copyright  2022 Université de Montréal
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class note extends moodleform  implements renderable {

    /**
     * Note form definition.
     */
    public function definition() {
        $mform = $this->_form;
        $mform->setAttributes(['id' => 'noteform'] + $mform->getAttributes());
        $mform->addElement('hidden', 'subjectorigin');
        $mform->setType('subjectorigin', PARAM_TEXT);
        $mform->addElement('hidden', 'noteid');
        $mform->setType('noteid', PARAM_TEXT);

        $buttonarray = [];

        $buttonarray[] = $mform->createElement('cancel', '', get_string('cancel'),
                ['data-action' => 'cancel',
                'aria-label' => get_string('cancel'),
                'id' => 'cancel-add-edit']);

        $buttonarray[] = $mform->createElement('submit', '', get_string('save'),
            ['data-action' => 'save',
            'id' => 'savenote',
            'aria-label' => get_string('notesave', 'local_notebook')]);

        $mform->addElement('html', \html_writer::start_div('', ['data-region' => 'footer']));
        $mform->addGroup($buttonarray, 'buttonar', '', ' ', false);
        $mform->addElement('html', \html_writer::end_div());

        $mform->addElement('text', 'subject', '', ['data-required' => 'true', 'maxlength' => 255,
            'aria-label' => get_string('notesubject', 'local_notebook')]);
        $mform->setType('subject', PARAM_TEXT);

        $mform->addElement('editor', 'note', '', ['data-required' => 'true',
            'aria-label' => get_string('notecontent', 'local_notebook')]);
        $mform->setType('note', PARAM_CLEANHTML);

        // Accessiblity for required fields.
        $mform->addElement('html', \html_writer::span(get_string('formrequiredfields', 'local_notebook'), 'sr-only'));
    }
}
