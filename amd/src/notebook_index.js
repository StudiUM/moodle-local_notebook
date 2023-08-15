/* eslint-disable no-restricted-globals */
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
        bootstrapTable: M.cfg.wwwroot + '/local/notebook/amd/build/bootstrap-table.min',
        bootstrapTableLocale: M.cfg.wwwroot + '/local/notebook/amd/build/bootstrap-table-locale-all.min',
        bootstrapTableLocaleMobile: M.cfg.wwwroot + '/local/notebook/amd/build/bootstrap-table-mobile.min'
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
        NOTE_LIST_CONTAINER: '[data-region="notebook-index"] .notelistcontainer',
        NOTE_TABLE_CONTAINER: '#notebook-table-index-container',
        NOTE_TABLE: '#notebook-table-index',
        NOTE_TABLE_LOADING: '#notebook-table-index-loading',
        REFRESH_BUTTON: 'button[name="refresh"]',
        SAVE_BUTTON: '#savenote',
        CANCEL_BUTTON: '#cancel-add-edit',
        NOTE_FORM_ID: 'noteform',
        NOTE_SUMMARY: '#id_notebook_editor',
        VIEW_NOTE: '#notebook-table-index .viewnote',
        NOTE_VIEW: '[data-region="notebook-index"] .view-note',
        NOTE_TABLE_ROW: '#notebook-table-index tr',
        FOOTER_NOTE_VIEW: '[data-region="footer-container"] [data-region="view-note"]',
        HEADER_NOTE_VIEW: '[data-region="header-container"] [data-region="view-note"]',
        HEADER_NOTE_CREATED_DATE: '[data-region="header-container"] .notecreateddate',
        HEADER_NOTE_LAST_MODIFIED_DATE: '[data-region="header-container"] .notelastmodifieddate',
        NOTE_FORM: '[data-region="form-note"] #noteform',
        HEADER_NOTE_HIDE_LIST: '[data-region="header-container"] .hidelist',
        HEADER_NOTE_SHOW_LIST: '[data-region="header-container"] .showlist',
        HEADER_NOTE_DELETE: '[data-region="header-container"] .deletenote',
        HEADER_NOTE_EDIT: '[data-region="header-container"] .editnote',
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
        TABLE_DELETE_BUTTON: '[data-region="notebook-index"] #remove',
        TABLE_PAGINATION: '[data-region="notebook-index"] .fixed-table-pagination',
        NOTE_DETAIL_CONTAINER: '#notedetailcontainer'

    };
    /** Editor listeners state */
    var editorListenersInitialized = false;
    var listNotesHidden = false;

    /**
     * Refresh notes.
     *
     */
    var refreshNotes = () => {
        let previousPageNumber = this.$table.bootstrapTable('getOptions').pageNumber;
        this.$table.bootstrapTable('destroy');
        displayNotes(previousPageNumber);
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
            // TODO: Replace with mustache rendering.
            // If item has a # it means course or activity has been deleted.
            let badge = 'badge-info badge-pill';
            if (item.url === '#') {
                badge = 'badge-secondary';
                tagshtml += '<span class="badge ' + badge + ' text-truncate context-note" title="' + item.tooltip + '">'
                    + item.title + '</span>';
            } else {
                tagshtml += '<span class="badge ' + badge + ' text-truncate context-note">'
                    + '<a title="' + item.tooltip + '" href="' + item.url + '">' + item.title + '</a></span>';
            }
        });

        return tagshtml;
    };

    /**
     * Add blur note content.
     *
     */
    var addBlurContent = () => {
        let selectors = SELECTORS.FOOTER_NOTE_VIEW + ', ' + SELECTORS.HEADER_NOTE_CREATED_DATE + ', ' +
            SELECTORS.HEADER_NOTE_LAST_MODIFIED_DATE + ', ' + SELECTORS.NOTE_VIEW;
        $(selectors).addClass('blur-content');
    };

    /**
     * Remove blur note content.
     *
     */
    var removeBlurContent = () => {
        let selectors = SELECTORS.FOOTER_NOTE_VIEW + ', ' + SELECTORS.HEADER_NOTE_CREATED_DATE + ', ' +
            SELECTORS.HEADER_NOTE_LAST_MODIFIED_DATE + ', ' + SELECTORS.NOTE_VIEW;
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
        promises[0].done(function(result) {
            let data = {};
            data.subject = result.subject;
            data.summary = result.summary;

            // Note created datetime.
            let timestamp = result.created * 1000;
            let datecreation = new Date(timestamp).toLocaleDateString(document.documentElement.lang, {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            let timecreation = new Date(timestamp).toLocaleTimeString(document.documentElement.lang);

            // Note last modified datetime.
            let lastmodifiedtimestamp = result.lastmodified * 1000;
            let lastmodifieddate = new Date(lastmodifiedtimestamp).toLocaleDateString(document.documentElement.lang, {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            let lastmodifiedtime = new Date(lastmodifiedtimestamp).toLocaleTimeString(document.documentElement.lang);
            Templates.render('local_notebook/note_content', data)
                .then(function(html) {
                    // Display content.
                    $(SELECTORS.NOTE_VIEW).html(html);
                    // Display dates.
                    $(SELECTORS.HEADER_NOTE_CREATED_DATE).html(datecreation + ' ' + timecreation);
                    $(SELECTORS.HEADER_NOTE_LAST_MODIFIED_DATE).html(lastmodifieddate + ' ' + lastmodifiedtime);
                    // Set buttons.
                    $(SELECTORS.HEADER_NOTE_DELETE).data('noteid', result.id);
                    $(SELECTORS.HEADER_NOTE_EDIT).data('noteid', result.id);
                    // Set tags.
                    $(SELECTORS.FOOTER_NOTE_TAGS).html(getFormattedTags(result.tags));
                    // Remove blur content.
                    removeBlurContent();
                    // Log viewed event.
                    return promises[1].done(function() { }).fail(Notification.exception);
                })

                .fail(Notification.exception);
        }).fail(Notification.exception);
    };


    /**
     * Display notes.
     *
     * @param {Number} pageNumber The pagination page number
     */
    var displayNotes = (pageNumber) => {
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
                key: 'notedate',
                component: 'local_notebook',
            },
            {
                key: 'displaynote',
                component: 'local_notebook',
            },
            {
                key: 'lastmodifieddate',
                component: 'local_notebook',
            }
        ];

        // eslint-disable-next-line promise/always-return
        str.get_strings(stringkeys).then(function(langStrings) {
            let data = [];
            promises[0].done(function(result) {
                $.each(result, function(index, value) {
                    let subject = {};
                    subject.text = value.subject;
                    subject.tags = value.tags;
                    data.push({
                        'id': value.id,
                        'subjecttext': value.subject,
                        'subject': subject,
                        'lastmodified': value.lastmodified
                    });
                });
                this.$table.bootstrapTable({
                    locale: document.documentElement.lang,
                    paginationParts: ['pageInfo', 'pageSize', 'pageList'],
                    paginationSuccessivelySize: 2,
                    paginationPagesBySide: 1,
                    data: data,
                    pageNumber: pageNumber,
                    columns: [
                        [{
                            field: 'state',
                            checkbox: true
                        },
                        {
                            field: 'subjecttext',
                            visible: false
                        },
                        {
                            field: 'subject',
                            title: langStrings[0],
                            sortable: true,
                            sortName: 'subjecttext',
                            formatter: function(value) {
                                let nbtags = value.tags.length;
                                var td = "<span class='text-truncate subject'>" + value.text + "</span><br>";
                                var nbclass = nbtags === 1 ? 'wcn-1' : 'wcn-2';
                                value.tags.forEach(function(item) {
                                    // TODO: Replace with mustache rendering.
                                    // If item has a # it means course or activity has been deleted.
                                    let badge = 'badge-info badge-pill';
                                    if (item.url === '#') {
                                        badge = 'badge-secondary';
                                        td += '<span class="badge ' + badge + ' text-truncate context-note ' + nbclass
                                            + '" title="' + item.tooltip + '">' + item.title + '</span>';
                                    } else {
                                        td += '<span class="badge ' + badge + ' text-truncate context-note ' + nbclass
                                            + '"><a title="' + item.tooltip + '" href="' + item.url + '">'
                                            + item.title + '</a></span>';
                                    }
                                });
                                return td;
                            }
                        },
                        {
                            field: 'lastmodified',
                            title: langStrings[1],
                            sortable: true,
                            formatter: function(value) {
                                var today = new Date(value * 1000).toLocaleDateString(document.documentElement.lang, {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                });
                                return today;
                            },
                            width: 110,
                            titleTooltip: langStrings[3]
                        },
                        {
                            field: 'operate',
                            title: '',
                            align: 'center',
                            width: 35,
                            formatter: function(value, row) {
                                return [
                                    '<a class="viewnote" data-noteid="' + row.id + '" ' +
                                    'href="#notedetailcontainer" title="' + langStrings[2] + '">',
                                    '<i class="fa fa-chevron-right" aria-hidden="true"></i>',
                                    '</a>'
                                ].join('');
                            }
                        }]
                    ],
                    onPostBody: function() {
                        // Wrap the second and the third card view for Flexbox.
                        $(".card-views").each(function() {
                            $(this).find('.card-view').slice(1, 3).wrapAll('<div class="item-content" />');
                        });
                        // Hide notebook table loading.
                        $(SELECTORS.NOTE_TABLE_LOADING).addClass('hidden');
                        // Display notebook table.
                        $(SELECTORS.NOTE_TABLE_CONTAINER).removeClass('hidden');
                        // Init pagination rows per page dropdown.
                        $(SELECTORS.TABLE_PAGINATION + ' .dropdown-toggle').dropdown();
                    }
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
            $(SELECTORS.NOTEINDEX + ' ' + SELECTORS.CHECKBOX_LIST_NOTE + ':checked').each(function() {
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
                $(SELECTORS.HEADER_NOTE_DELETE).data('noteid'));
            $(SELECTORS.CONFIRM_DELETE_BUTTON_SINGLE).focus();
        }
        window.scrollTo(0, $(SELECTORS.DIALOGUE_CONTAINER).position().top);
    };

    /**
     * Submit form ajax.
     * @return {boolean}
     */
    var submitFormAjax = () => {
        if ($(document.activeElement).data('action') == 'reset') {
            cancelNoteForm();
        } else {
            // Add an extra check in case one of the input is empty
            if (isEmpty()) {
                toggleSaveButton();
                return;
            }
            let args = {};
            args.noteid = $(SELECTORS.NOTE_FORM + ' input[name="noteid"]').val();
            args.subject = $(SELECTORS.NOTE_FORM + ' input[name="subject"]').val();
            args.note = $(SELECTORS.NOTE_SUMMARY).val();
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
                        displayNote(args.noteid);
                        // hide the notes list if already the case before
                        if(listNotesHidden) { hideNoteList(); }
                    }
                },
                fail: notification.exception
            }]);
        }
        return false;
    };

    /**
     * Submit delete ajax.
     * @return {boolean}
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
        $(SELECTORS.HEADER_NOTE_EDIT).focus();
    };

    /**
     * Check if the editor is the tiny mce
     * @returns {boolean} is tiny mce editor
     */
    var isTinyMceEditor = () => window.tinyMCE !== undefined;

    /**
     * Get the tiny mce editor
     * @returns {object} Tiny Mce editor instance
     */
    var getTinyMce = () => window.tinyMCE.get(SELECTORS.NOTE_SUMMARY.replace('#', ''));

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

        if (!editorListenersInitialized) {
            // Enable/disabled save button.
            if (isTinyMceEditor()) {
                getTinyMce().on('KeyUp', toggleSaveButton);
                getTinyMce().on('ExecCommand', toggleSaveButton);
            } else {
                $(SELECTORS.FORM_CONTAINER + ' form textarea').on('change', toggleSaveButton);
            }
            $(SELECTORS.FORM_CONTAINER + ' form input[type="text"]').on('input', toggleSaveButton);
        }
    };

    /**
    * Hide note List
    */
    var hideNoteList = () => {
        // hide the note list section
        $(SELECTORS.NOTE_LIST_CONTAINER).attr('display', 'none');
        $(SELECTORS.NOTE_LIST_CONTAINER).removeClass().addClass('notelistcontainer hidden');
        // make the section note view the full width of the page
        $(SELECTORS.NOTE_DETAIL_CONTAINER).removeClass('col-xl-5');
        $(SELECTORS.NOTE_DETAIL_CONTAINER).addClass('col-xl-12');
        // switch the button to show notes list
        $(SELECTORS.HEADER_NOTE_HIDE_LIST).addClass('hidden');
        $(SELECTORS.HEADER_NOTE_HIDE_LIST).attr('aria-hidden', true);
        $(SELECTORS.HEADER_NOTE_SHOW_LIST).removeClass('hidden');
        $(SELECTORS.HEADER_NOTE_SHOW_LIST).removeAttr('aria-hidden');
        // notes list hidden (listener)
        listNotesHidden = true;
    };

    /**
    * Show note List
    */
    var showNoteList = () => {
        // hide the note list section
        $(SELECTORS.NOTE_LIST_CONTAINER).removeClass('hidden');
        $(SELECTORS.NOTE_LIST_CONTAINER).removeAttr('display');
        $(SELECTORS.NOTE_LIST_CONTAINER).addClass('col-12 col-xl-7 d-flex flex-column border pr-2 pl-2  mt-2');
        // make the section note view with default width
        $(SELECTORS.NOTE_DETAIL_CONTAINER).removeClass('col-xl-12');
        $(SELECTORS.NOTE_DETAIL_CONTAINER).addClass('col-xl-5');
        // switch the button to hide notes list
        $(SELECTORS.HEADER_NOTE_SHOW_LIST).addClass('hidden');
        $(SELECTORS.HEADER_NOTE_SHOW_LIST).attr('aria-hidden', true);
        $(SELECTORS.HEADER_NOTE_HIDE_LIST).removeClass('hidden');
        $(SELECTORS.HEADER_NOTE_HIDE_LIST).removeAttr('aria-hidden');
        // notes list shown (listener)
        listNotesHidden = false;
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
                    if (isTinyMceEditor()) {
                        getTinyMce().setContent(result.summary);
                    } else {
                        $(SELECTORS.FORM_CONTAINER + " #id_notebook_editoreditable").html(result.summary);
                    }
                    $(SELECTORS.NOTE_FORM + ' textarea').val($(SELECTORS.NOTE_VIEW + ' .textareaorigin').val());
                    $(SELECTORS.NOTE_FORM + ' textarea').trigger('change');
                    $(SELECTORS.NOTE_FORM + ' input[name="subject"]').val(result.subject);
                    $(SELECTORS.NOTE_FORM + ' input[name="noteid"]').val(noteid);
                    hideNoteView(SELECTORS.NOTE_FORM + ' input[name="subject"]');
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
            setTimeout(function() {
                $(SELECTORS.MESSAGE_SUCCESS_CONTAINER + ' .alert').fadeOut();
            }, 10000);
        });
    };

    /**
     * Toggle save button.
     *
     */
    var toggleSaveButton = () => {
        $(SELECTORS.NOTE_FORM + ' ' + SELECTORS.SAVE_BUTTON).prop('disabled', isEmpty());
    };

    /**
     * Check if the title or the editor is empty
     * @returns {boolean} Is empty
     */
    var isEmpty = ()=>{
        let editorcontent = isTinyMceEditor()
            ? getTinyMce().getContent()
            : $(SELECTORS.FORM_CONTAINER + " #id_notebook_editoreditable").html();
        let emptyTitle = $(SELECTORS.NOTE_FORM + ' input[type="text"]').val() == '';
        let emptyEditor = editorcontent !== undefined && editorcontent.replace(/<(.|\n)*?>/g, '').trim().length === 0
        && !editorcontent.includes("<img");
        return emptyTitle || emptyEditor;
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
        $(SELECTORS.NOTEINDEX).on('click', SELECTORS.REFRESH_BUTTON, function() {
            refreshNotes();
        });
        // Note table row click event.
        $(SELECTORS.NOTEINDEX).on('click', SELECTORS.NOTE_TABLE_ROW + ' td:not(:first-child)', function(e) {
            if (!$(e.target).hasClass('context-note') &&
                !$(e.target).parent().hasClass('context-note')) {
                let noteid = $(this).closest('tr').find('.viewnote').data('noteid');
                $(SELECTORS.NOTEINDEX + ' #notebook-table-index tr.selected').removeClass('selected');
                displayNote(noteid);
                $(this).closest('tr').addClass('selected');
            }
        });
        // Note table row checkbox cell click event.
        $(SELECTORS.NOTEINDEX).on('click', SELECTORS.NOTE_TABLE_ROW + ' td:first-child', function(e) {
            if ($(this).find('.card-views').length) { // card view mode.
                if (!$(e.target).is('label, input') &&
                    !$(e.target).hasClass('context-note') &&
                    !$(e.target).parent().hasClass('context-note')) {
                    let noteid = $(this).closest('tr').find('.viewnote').data('noteid');
                    $(SELECTORS.NOTEINDEX + ' #notebook-table-index tr.selected').removeClass('selected');
                    displayNote(noteid);
                    $(this).closest('tr').addClass('selected');
                    window.scrollTo(0, $(SELECTORS.NOTE_DETAIL_CONTAINER).position().top);
                }
            } else {
                $(this).find('input[type="checkbox"]').trigger('click');
            }
        });
        // Hide note list.
        $(SELECTORS.NOTEINDEX).on('click', SELECTORS.HEADER_NOTE_HIDE_LIST, function() {
            hideNoteList();
        });
        // Show note list.
        $(SELECTORS.NOTEINDEX).on('click', SELECTORS.HEADER_NOTE_SHOW_LIST, function() {
            showNoteList();
        });
        // Edit note.
        $(SELECTORS.NOTEINDEX).on('click', SELECTORS.HEADER_NOTE_EDIT, function() {
            editNoteView($(this).data('noteid'));
        });
        // Cancel edit note.
        $(SELECTORS.NOTEINDEX).on('click', SELECTORS.CANCEL_BUTTON, function(e) {
            e.preventDefault();
            let noteid = $(SELECTORS.NOTE_FORM + ' input[name="noteid"]').val();
            displayNote(noteid);
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
