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
 * Controls the notebook index.
 *
 * @module     local_notebook/notebook_index
 * @copyright  2022 Université de Montréal
 * @author     Issam Taboubi <issam.taboubi@umontreal.ca>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
require.config({
    enforceDefine: true,
    shim: {
        'bootstrapTable': ['jquery'],
        'bootstrapTableLocale': ['jquery', 'bootstrapTable'],
        'bootstrapTableLocaleMobile': ['jquery', 'bootstrapTable']
    },
    paths: {
        bootstrapTable: '/local/notebook/amd/build/bootstrap-table.min',
        bootstrapTableLocale: '/local/notebook/amd/build/bootstrap-table-locale-all.min',
        bootstrapTableLocaleMobile: '/local/notebook/amd/build/bootstrap-table-mobile.min'
    }
});

define(
    [
        'jquery',
        'core/notification',
        'core/str',
        'core/ajax',
        'core/templates',
        'bootstrapTable',
        'bootstrapTableLocale',
        'bootstrapTableLocaleMobile',
    ], function(
        $,
        notification,
        str,
        ajax,
        Templates
    ) {

        var SELECTORS = {
            NOTEBOOKCONTAINER: '.notebookcontainer',
            NOTEINDEX: '[data-region="notebook-index"]',
            HEADER_CONTAINER: '[data-region="header-container"]',
            BODY_CONTAINER: '[data-region="body-container"]',
            FORM_CONTAINER: '[data-region="form-note"]',
            CLOSE_BUTTON: '[data-action="closedrawer"]',
            NOTE_TABLE: '#notebook-table-index',
            REFRESH_BUTTON: 'button[name="refresh"]',
            SAVE_BUTTON: '#savenote',
            RESET_BUTTON: '#resetnote',
            NOTE_FORM_ID: 'noteform',
            VIEW_NOTE: '#notebook-table-index .viewnote',
            NOTE_VIEW: '[data-region="notebook-index"] .view-note',
            FOOTER_NOTE_VIEW: '[data-region="footer-container"] [data-region="view-note"]',
            HEADER_NOTE_VIEW: '[data-region="header-container"] [data-region="view-note"]',
            HEADER_NOTE_DATE: '[data-region="header-container"] .notedate',
            NOTE_FORM: '[data-region="form-note"] #noteform',
            FOOTER_NOTE_DELETE: '[data-region="footer-container"] .deletenote',
            FOOTER_NOTE_EDIT: '[data-region="footer-container"] .editnote',
            FOOTER_NOTE_TAGS: '[data-region="footer-container"] .notetags',
            MESSAGE_SUCCESS_CONTAINER: '.notebookcontainer .messagesuccesscontainer',
            DIALOGUE_CONTAINER: '.notebookcontainer [data-region="confirm-dialogue-container"]',
            CONFIRM_TEXT_MULTI: '.notebookcontainer [data-region="confirm-dialogue-container"] ' +
                '.multiplenotes',
            CONFIRM_TEXT_SINGLE: '.notebookcontainer [data-region="confirm-dialogue-container"] ' +
                '.singlenote',
            CONFIRM_DELETE_BUTTON_MULTI: '[data-region="confirm-dialogue-container"] [data-action="confirm-delete-multiple"]',
            CONFIRM_DELETE_BUTTON_SINGLE: '[data-region="confirm-dialogue-container"] [data-action="confirm-delete-single"]',
            CANCEL_DELETE_BUTTON_MULTI: '[data-region="confirm-dialogue-container"] [data-action="cancel-delete-multiple"]',
            CANCEL_DELETE_BUTTON_SINGLE: '[data-region="confirm-dialogue-container"] [data-action="cancel-delete-single"]',
            DELETE_NOTE_BUTTON: '.deletenote',
            CHECKBOX_LIST_NOTE: '[name="btSelectItem"]',
            CHECKBOX_ALL_NOTE: '[name="btSelectAll"]',
            TABLE_DELETE_BUTTON: '[data-region="notebook-index"] #remove'
        };

        /**
         * Refresh notes.
         *
         */
        var refreshNotes = () => {
            this.$table.bootstrapTable('destroy');
            displayNotes();
        };

        /**
         * Get formatted tags.
         *
         * @param {Array.<Object>} tags
         * @return {String} return tags html
         */
        var getFormattedTags = (tags) => {
            var tagshtml = '';

            tags.forEach(function(item) {
                tagshtml += '<span class="badge badge-info text-truncate context-note">'
                    + '<a title="' + item.title + '" href="' + item.url + '">' + item.title + '</a></span>';
            });

            return tagshtml;
        };

        /**
         * Add blur note content.
         *
         */
        var addBlurContent = () => {
            let selectors = SELECTORS.FOOTER_NOTE_VIEW + ', ' + SELECTORS.HEADER_NOTE_DATE + ', ' + SELECTORS.NOTE_VIEW;
            $(selectors).addClass('blur-content');
        };

        /**
         * Remove blur note content.
         *
         */
        var removeBlurContent = () => {
            let selectors = SELECTORS.FOOTER_NOTE_VIEW + ', ' + SELECTORS.HEADER_NOTE_DATE + ', ' + SELECTORS.NOTE_VIEW;
            $(selectors).removeClass('blur-content');
        };

        /**
         * Display note.
         *
         * @param {String} noteid The note id
         */
        var displayNote = (noteid) => {
            var promises = [];
            displayNoteView();
            addBlurContent();

            promises = ajax.call([{
                methodname: 'local_notebook_read_note',
                args: {
                    noteid: noteid
                }
            },
            {
                methodname: 'local_notebook_note_viewed',
                args: {
                    id: noteid
                }
            }]);
            promises[0].done(function (result) {
                let data = {};
                data.subject = result.subject;
                data.summary = result.summary;
                let timestamp = result.created * 1000;
                let datecreation = new Date(timestamp).toLocaleDateString(document.documentElement.lang, {
                    day : 'numeric',
                    month : 'short',
                    year : 'numeric'
                });
                let timecreation = new Date(timestamp).toLocaleTimeString(document.documentElement.lang);
                Templates.render('local_notebook/note_content', data)
                .then(function(html) {
                    // Display content.
                    $(SELECTORS.NOTE_VIEW).html(html);
                    // Display date.
                    $(SELECTORS.HEADER_NOTE_DATE).html(datecreation + ' ' + timecreation);
                    // Set buttons.
                    $(SELECTORS.FOOTER_NOTE_DELETE).data('noteid', result.id);
                    $(SELECTORS.FOOTER_NOTE_EDIT).data('noteid', result.id);
                    // Set tags.
                    $(SELECTORS.FOOTER_NOTE_TAGS).html(getFormattedTags(result.tags));
                    // Remove blur content.
                    removeBlurContent();
                    // Log viewed event.
                    promises[1].done(function () {}).fail(Notification.exception);
                })
                .fail(Notification.exception);
            }).fail(Notification.exception);
        };


        /**
         * Display notes.
         *
         */
        var displayNotes = () => {
            var promises = [];

            promises = ajax.call([{
                methodname: 'local_notebook_notes_list',
                args: {
                    userid: this.userid,
                    courseid: this.courseid,
                    coursemoduleid: this.coursemoduleid
                }
            }]);
            var stringkeys = [
                {
                    key: 'notetitle',
                    component: 'local_notebook'
                },
                {
                    key: 'notecontext',
                    component: 'local_notebook',
                },
                {
                    key: 'notedate',
                    component: 'local_notebook',
                },
                {
                    key: 'displaynote',
                    component: 'local_notebook',
                }
            ];

            str.get_strings(stringkeys).then(function(langStrings) {
                let data = [];
                promises[0].done(function (result) {
                    $.each(result, function (index, value) {
                        let subject = {};
                        subject.text = value.subject;
                        subject.tags = value.tags;
                        data.push({
                            'id': value.id,
                            'subject': subject,
                            'contextname': value.contextname,
                            'created': value.created
                        });
                    });
                    this.$table.bootstrapTable({
                        locale: document.documentElement.lang,
                        paginationParts: ['pageInfo', 'pageList'],
                        paginationSuccessivelySize: 2,
                        paginationPagesBySide: 1,
                        data: data,
                        columns: [
                            [{
                                field: 'state',
                                checkbox: true
                            },
                            {
                                field: 'subject',
                                title: langStrings[0],
                                sortable: true,
                                width: 300,
                                formatter: function(value) {
                                    let nbtags = value.tags.length;
                                    var td = "<span class='text-truncate subject'>" + value.text + "</span><br>";
                                    var nbclass = nbtags === 1 ? 'wcn-1' : 'wcn-2';
                                    value.tags.forEach(function(item) {
                                        td += '<span class="badge badge-info text-truncate context-note ' + nbclass
                                            + '"><a title="' + item.title + '" href="' + item.url + '">'
                                            + item.title + '</a></span>';
                                    });
                                    return td;
                                }
                            },
                            {
                                field: 'contextname',
                                title: langStrings[1],
                                sortable: true
                            },
                            {
                                field: 'created',
                                title: langStrings[2],
                                sortable: true,
                                formatter: function(value) {
                                    var today = new Date(value * 1000).toLocaleDateString(document.documentElement.lang, {
                                        day : 'numeric',
                                        month : 'short',
                                        year : 'numeric'
                                    });
                                    return today;
                                },
                                width: 110
                            },
                            {
                                field: 'operate',
                                title: '',
                                align: 'center',
                                formatter: function(value, row) {
                                    return [
                                        '<a class="viewnote" data-noteid="' + row.id + '" ' +
                                        'href="#notedetailcontainer" title="' + langStrings[3] + '">',
                                        '<i class="fa fa-chevron-right" aria-hidden="true"></i>',
                                        '</a>'
                                    ].join('');
                                }
                            }]
                        ]
                    });
                }).fail(notification.exception);
            }).fail(Notification.exception);
        };

        /**
         * Close the confirm delete dialogue..
         *
         * @param {String} action The action type of cancel.
         * @param {Boolean} focus
         */
        var closeConfirmDialogue = (action, focus) => {
            $(SELECTORS.DIALOGUE_CONTAINER).addClass('hidden');
            if (!focus) {
                return;
            }
            if (action === 'multiple') {
                $(SELECTORS.TABLE_DELETE_BUTTON).focus();
            } else {
                $(SELECTORS.DELETE_NOTE_BUTTON).focus();
            }
        };

        /**
         * Show the confirm delete dialogue..
         *
         * @param {String} action
         */
        var showConfirmDialogue = (action) => {
            $(SELECTORS.DIALOGUE_CONTAINER).removeClass('hidden');
            if (action === 'multiple') {
                let toshow = SELECTORS.CONFIRM_TEXT_MULTI + ', ' + SELECTORS.CONFIRM_DELETE_BUTTON_MULTI + ',' +
                    SELECTORS.CANCEL_DELETE_BUTTON_MULTI;
                let tohide = SELECTORS.CONFIRM_TEXT_SINGLE + ', ' + SELECTORS.CONFIRM_DELETE_BUTTON_SINGLE + ',' +
                    SELECTORS.CANCEL_DELETE_BUTTON_SINGLE;
                $(tohide).addClass('hidden');
                $(toshow).removeClass('hidden');
                let list = [];
                $(SELECTORS.NOTEINDEX + ' ' + SELECTORS.CHECKBOX_LIST_NOTE + ':checked').each(function(){
                    list.push($(this).val());
                });
                $(SELECTORS.CONFIRM_DELETE_BUTTON_MULTI).data('noteid', list);
                $(SELECTORS.CONFIRM_DELETE_BUTTON_MULTI).focus();
            } else {
                let tohide = SELECTORS.CONFIRM_TEXT_MULTI + ', ' + SELECTORS.CONFIRM_DELETE_BUTTON_MULTI + ',' +
                    SELECTORS.CANCEL_DELETE_BUTTON_MULTI;
                let toshow = SELECTORS.CONFIRM_TEXT_SINGLE + ', ' + SELECTORS.CONFIRM_DELETE_BUTTON_SINGLE + ',' +
                    SELECTORS.CANCEL_DELETE_BUTTON_SINGLE;
                $(tohide).addClass('hidden');
                $(toshow).removeClass('hidden');
                $(SELECTORS.CONFIRM_DELETE_BUTTON_SINGLE).data('noteid',
                $(SELECTORS.FOOTER_NOTE_DELETE).data('noteid'));
                $(SELECTORS.CONFIRM_DELETE_BUTTON_SINGLE).focus();
            }
            window.scrollTo(0, $(SELECTORS.DIALOGUE_CONTAINER).position().top);
        };

        /**
         * Submit form ajax.
         *
         */
        var submitFormAjax = () => {
            if ($(document.activeElement).data('action') == 'reset') {
                cancelNoteForm();
            } else {
                let args = {};
                args.noteid = $(SELECTORS.NOTE_FORM +' input[name="noteid"]').val();
                args.subject = $(SELECTORS.NOTE_FORM +' input[name="subject"]').val();
                args.note = $(SELECTORS.NOTE_FORM).serialize();
                ajax.call([{
                    methodname: 'local_notebook_update_note',
                    args: args,
                    done: function(result) {
                        if (result) {
                                // Refresh list.
                                refreshNotes();
                                // Display message success.
                                displayMessageSuccess('notesaved');
                                // Display Note view.
                                displayNoteView();
                                // Display note.
                                displayNote(args.noteid );
                        }
                    },
                    fail: notification.exception
                }]);
            }
            return false;
        };

        /**
         * Submit delete ajax.
         *
         */
        var submitDeleteAjax = () => {
            let action = $(document.activeElement).data('action');
            let notesids = [];
            let keymessage = 'notedeleted';
            if (action === 'confirm-delete-multiple') {
                notesids = $(document.activeElement).data('noteid');
                keymessage = 'notedeletedmultiple';
            } else {
                notesids.push($(document.activeElement).data('noteid'));
            }
            ajax.call([{
                methodname: 'local_notebook_delete_notes',
                args: {notes: notesids},
                done: function(result) {
                    if (result) {
                        // Close dialogue.
                        closeConfirmDialogue('multiple', false);
                        hideNoteView(false);
                        // Display success message.
                        displayMessageSuccess(keymessage);
                        // Refresh list.
                        refreshNotes();
                        // Hide form.
                        hideNoteForm();
                    }
                },
                fail: notification.exception
            }]);
            return false;
        };

        /**
         * Cancel form.
         *
         */
        var cancelNoteForm = () => {
            displayNoteView();
            $(SELECTORS.FOOTER_NOTE_EDIT).focus();
        };

        /**
         * Hide note view.
         *
         * @param {String} focus
         */
        var hideNoteView = (focus) => {
            $(SELECTORS.HEADER_NOTE_VIEW).addClass('hidden');
            $(SELECTORS.HEADER_NOTE_VIEW).attr('aria-hidden', true);
            $(SELECTORS.FOOTER_NOTE_VIEW).addClass('hidden');
            $(SELECTORS.FOOTER_NOTE_VIEW).attr('aria-hidden', true);
            $(SELECTORS.NOTE_VIEW).addClass('hidden');
            $(SELECTORS.NOTE_VIEW).attr('aria-hidden', true);
            $(SELECTORS.FORM_CONTAINER).removeClass('hidden');
            $(SELECTORS.FORM_CONTAINER).removeAttr('aria-hidden');
            // Set focus back to last item clicked.
            if (!focus) {
                return;
            }
            $(focus).focus();
        };

        /**
         * Hide note view.
         */
        var hideNoteForm = () => {
            $(SELECTORS.FORM_CONTAINER).addClass('hidden');
            $(SELECTORS.FORM_CONTAINER).attr('aria-hidden', true);
        };

        /**
         * Display note view.
         */
        var displayNoteView = () => {
            $(SELECTORS.HEADER_NOTE_VIEW).removeClass('hidden');
            $(SELECTORS.HEADER_NOTE_VIEW).removeAttr('aria-hidden');
            $(SELECTORS.FOOTER_NOTE_VIEW).removeClass('hidden');
            $(SELECTORS.FOOTER_NOTE_VIEW).removeAttr('aria-hidden');
            $(SELECTORS.NOTE_VIEW).removeClass('hidden');
            $(SELECTORS.NOTE_VIEW).removeAttr('aria-hidden');
            $(SELECTORS.FORM_CONTAINER).addClass('hidden');
            $(SELECTORS.FORM_CONTAINER).attr('aria-hidden', true);
        };

        /**
         * Edit note view.
         *
         * @param {String} noteid
         */
        var editNoteView = (noteid) => {
            ajax.call([{
                methodname: 'local_notebook_read_note',
                args: {noteid: noteid},
                done: function(result) {
                    if (result) {
                        $(SELECTORS.FORM_CONTAINER + " #id_noteeditable").html(result.summary);
                        $(SELECTORS.NOTE_FORM + ' textarea').val($(SELECTORS.NOTE_VIEW + ' .textareaorigin').val());
                        $(SELECTORS.NOTE_FORM + ' textarea').trigger('change');
                        $(SELECTORS.NOTE_FORM +' input[name="subject"]').val(result.subject);
                        $(SELECTORS.NOTE_FORM +' input[name="noteid"]').val(noteid);
                        hideNoteView(SELECTORS.NOTE_FORM +' input[name="subject"]');
                        toggleSaveButton();
                    }
                },
                fail: notification.exception
            }]);
        };

        /**
         * Display message success.
         *
         * @param {String} key the string identifier.
         *
         */
        var displayMessageSuccess = (key) => {
            // Remove old message.
            $(SELECTORS.MESSAGE_SUCCESS_CONTAINER).html('');
            var stringkeys = [
                {
                    key: key,
                    component: 'local_notebook'
                },
                {
                    key: 'close',
                    component: 'core'
                }
            ];

            str.get_strings(stringkeys).then(function(langStrings) {
                let messageHtml = '<div class="alert alert-success alert-block fade in " role="alert">' +
                '<button type="button" class="close" data-dismiss="alert" aria-label="' + langStrings[1] + '">×</button>' +
                langStrings[0] + '</div>';
                $(SELECTORS.MESSAGE_SUCCESS_CONTAINER).html(messageHtml);
                $(SELECTORS.MESSAGE_SUCCESS_CONTAINER + ' .alert button').focus();
            });
        };

        /**
         * Toggle save button.
         *
         */
        var toggleSaveButton = () => {
            let editorcontent = $(SELECTORS.FORM_CONTAINER + " #id_noteeditable").html();
            let emptyeditor = false;
            let noteid = $(SELECTORS.NOTE_FORM +' input[name="noteid"]').val();
            let samecontent = false;
            if (noteid !== '0') {
                let subjectform = $(SELECTORS.NOTE_FORM + ' input[type="text"]').val();
                let subjectorigin = $(SELECTORS.NOTEINDEX + ' .titlenote').html();
                let summaryorigin = $(SELECTORS.NOTEINDEX + ' .summarynote').html();
                if (subjectform.localeCompare(subjectorigin) === 0 && editorcontent.localeCompare(summaryorigin) === 0) {
                    samecontent = true;
                }
            }
            if (editorcontent.replace(/<(.|\n)*?>/g, '').trim().length === 0 && !editorcontent.includes("<img")) {
                emptyeditor = true;
            }
            if ($(SELECTORS.NOTE_FORM + ' input[type="text"]').val() == '' || emptyeditor || samecontent) {
                $(SELECTORS.NOTE_FORM + ' ' + SELECTORS.SAVE_BUTTON).prop('disabled', true);
            } else {
                $(SELECTORS.NOTE_FORM + ' ' + SELECTORS.SAVE_BUTTON).prop('disabled', false);
            }
        };

        /**
         * Toggle delete button.
         *
         */
        var toggleDeleteButton = () => {
            let listempty = true;
            if ($(SELECTORS.NOTEINDEX + ' ' + SELECTORS.CHECKBOX_LIST_NOTE + ':checked').length > 0) {
                listempty = false;
            }
            if (listempty) {
                $(SELECTORS.TABLE_DELETE_BUTTON).prop('disabled', true);
            } else {
                $(SELECTORS.TABLE_DELETE_BUTTON).prop('disabled', false);
            }
        };

        /**
         * Register events for the notebook index.
         *
         * @param {String} userid The user ID
         * @param {String} courseid The course ID
         * @param {String} coursemoduleid The cours module ID
         */
        var registerEventListeners = (userid, courseid, coursemoduleid) => {
            this.userid = userid;
            this.courseid = courseid;
            this.coursemoduleid = coursemoduleid;
            this.$table = $(SELECTORS.NOTE_TABLE);
            $(SELECTORS.NOTEINDEX).on('click', SELECTORS.REFRESH_BUTTON, function () {
                refreshNotes();
            });

            // View note.
            $(SELECTORS.NOTEINDEX).on('click', SELECTORS.VIEW_NOTE, function() {
                $(SELECTORS.NOTEINDEX + ' #notebook-table-index tr.selected').removeClass('selected');
                displayNote($(this).data('noteid'));
                $(this).closest('tr').addClass('selected');
            });
            // Edit note.
            $(SELECTORS.NOTEINDEX).on('click', SELECTORS.FOOTER_NOTE_EDIT, function() {
                editNoteView($(this).data('noteid'));
            });
            // Cancel delete note.
            $(SELECTORS.NOTEBOOKCONTAINER).on('click', SELECTORS.CANCEL_DELETE_BUTTON_SINGLE, function() {
                closeConfirmDialogue('single', true);
            });
            $(SELECTORS.NOTEBOOKCONTAINER).on('click', SELECTORS.CANCEL_DELETE_BUTTON_MULTI, function() {
                closeConfirmDialogue('multiple', true);
            });
            // Delete note button.
            $(SELECTORS.NOTEINDEX).on('click', SELECTORS.DELETE_NOTE_BUTTON, function() {
                let action = 'multiple';
                if ($(this).data('noteid')) {
                    action = 'single';
                }
                showConfirmDialogue(action);
            });
            // Confirm delete note button.
            $(SELECTORS.NOTEBOOKCONTAINER).on('click', SELECTORS.CONFIRM_DELETE_BUTTON_SINGLE + ' , ' +
                SELECTORS.CONFIRM_DELETE_BUTTON_MULTI, submitDeleteAjax);

            $(SELECTORS.FORM_CONTAINER).on('submit', 'form', submitFormAjax);

            // Enable/disbled save button.
            $(SELECTORS.FORM_CONTAINER + ' form input[type="text"]').on('input', toggleSaveButton);
            $(SELECTORS.FORM_CONTAINER + ' form textarea').on('change', toggleSaveButton);
            // Enable/disbled delete button.
            $(SELECTORS.NOTEINDEX).on('change', SELECTORS.CHECKBOX_LIST_NOTE + ', ' + SELECTORS.CHECKBOX_ALL_NOTE,
                            toggleDeleteButton);
        };

        /**
         * Initialise the notebook index.
         *
         * @param {String} userid The user ID
         * @param {String} courseid The course ID
         * @param {String} coursemoduleid The cours module ID
         */
        var init = (userid, courseid, coursemoduleid) => {
            registerEventListeners(userid, courseid, coursemoduleid);
            $(document).ready(function() {
                displayNotes();
            });
        };

        return {
            init: init,
        };
    });
