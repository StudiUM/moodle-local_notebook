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
 * Controls the notebook drawer.
 *
 * @module     local_notebook/notebook_drawer
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
        'core/custom_interaction_events',
        'core/drawer',
        'core/pubsub',
        'core/notification',
        'core/str',
        'core/ajax',
        'core/templates',
        'core_form/changechecker',
        'bootstrapTable',
        'bootstrapTableLocale',
        'bootstrapTableLocaleMobile',
    ], function(
        $,
        CustomEvents,
        Drawer,
        PubSub,
        notification,
        str,
        ajax,
        Templates,
        FormChangeChecker
    ) {

    var SELECTORS = {
        JUMPTO: '.notebookbutton [data-region="jumpto"]',
        DRAWER: '[data-region="right-hand-notebook-drawer"]',
        HEADER_CONTAINER: '[data-region="header-container"]',
        BODY_CONTAINER: '[data-region="body-container"]',
        BODY_LIST: '[data-region="view-overview"]',
        CLOSE_BUTTON: '[data-action="closedrawer"]',
        NOTE_TABLE: '#notebook-table',
        REFRESH_BUTTON: 'button[name="refresh"]',
        ADD_BUTTON_TO_CLONE: '#notebook-table-container .addnote',
        SAVE_BUTTON: '#savenote',
        CANCEL_BUTTON: '#cancel-add-edit',
        VIEW_NOTE: '[data-region="body-container"] #notebook-table .viewnote',
        BACK_TO_LIST: '[data-region="header-container"] .backtolist',
        NOTE_FORM_ID: 'noteform',
        NOTE_VIEW: '[data-region="body-container"] [data-region="view-note"]',
        FOOTER_NOTE_VIEW: '[data-region="footer-container"] [data-region="view-note"]',
        HEADER_NOTE_VIEW: '[data-region="header-container"] [data-region="view-note"]',
        HEADER_NOTE_CREATED_DATE: '[data-region="header-container"] .notecreateddate',
        HEADER_NOTE_LAST_MODIFIED_DATE: '[data-region="header-container"] .notelastmodifieddate',
        NOTE_FORM_CONTAINER: '[data-region="body-container"] #add-note-form-container',
        NOTE_LIST_CONTAINER: '[data-region="body-container"] #list-note-container',
        NOTE_TABLE_CONTAINER: '[data-region="body-container"] #notebook-table-container',
        NOTE_TABLE_ROW: '[data-region="body-container"] #notebook-table tr',
        NOTE_FORM: '[data-region="body-container"] #noteform',
        NOTE_SUMMARY: '#id_notebook_editor',
        NOTE_ITEMID: '[name="notebook_editor[itemid]"]',
        HEADER_NOTE_DELETE: '[data-region="header-container"] .deletenote',
        HEADER_NOTE_EDIT: '[data-region="header-container"] .editnote',
        FOOTER_NOTE_TAGS: '[data-region="footer-container"] .notetags',
        MESSAGE_SUCCESS_CONTAINER: '#message-success-container',
        DIALOGUE_CONTAINER: '[data-region="right-hand-notebook-drawer"] [data-region="confirm-dialogue-container"]',
        CONFIRM_TEXT_MULTI: '[data-region="right-hand-notebook-drawer"] [data-region="confirm-dialogue-container"] ' +
            '.multiplenotes',
        CONFIRM_TEXT_SINGLE: '[data-region="right-hand-notebook-drawer"] [data-region="confirm-dialogue-container"] ' +
            '.singlenote',
        CONFIRM_DELETE_BUTTON_MULTI: '[data-region="confirm-dialogue-container"] [data-action="confirm-delete-multiple"]',
        CONFIRM_DELETE_BUTTON_SINGLE: '[data-region="confirm-dialogue-container"] [data-action="confirm-delete-single"]',
        CANCEL_DELETE_BUTTON_MULTI: '[data-region="confirm-dialogue-container"] [data-action="cancel-delete-multiple"]',
        CANCEL_DELETE_BUTTON_SINGLE: '[data-region="confirm-dialogue-container"] [data-action="cancel-delete-single"]',
        DELETE_NOTE_BUTTON: '.deletenote',
        CHECKBOX_LIST_NOTE: '[name="btSelectItem"]',
        CHECKBOX_ALL_NOTE: '[name="btSelectAll"]',
        TABLE_DELETE_BUTTON: '#delete-selected-notes',
        NOTE_LIST_ACTIONS: '#note-list-actions',
        SELECTED_NOTE_COUNT: '#note-list-actions .selected-note-count',
        CLOSE_NOTE_LIST_ACTIONS: '#note-list-actions .close',
        TABLE_PAGINATION: '[data-region="right-hand-notebook-drawer"] .fixed-table-pagination',
        SEEALL_CONTAINER: '[data-region="footer-container"] [data-region="view-overview"]'
    };
    var Events = {
        SHOW: 'notebook-drawer-show',
        HIDE: 'notebook-drawer-hide',
        TOGGLE_VISIBILITY: 'notebook-drawer-toggle',
    };
    /** Editor listeners state */
    var editorListenersInitialized = false;

    /**
     * Show the Notebook drawer.
     *
     * @param {Object} root The notebook drawer container.
     */
    var show = (root) => {
        if (!root.attr('data-shown')) {
            root.attr('data-shown', true);
        }

        var drawerRoot = getDrawerRoot(root);
        if (drawerRoot.length) {
            Drawer.show(drawerRoot);
            // Here load list.
            displayNotes();
        }
    };

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
                tagshtml += '<span class="badge ' + badge + ' text-truncate context-note">'
                    + item.title + '</span>';
            } else {
                tagshtml += '<span class="badge ' + badge + ' text-truncate context-note">'
                    + '<a title="' + item.title + '" href="' + item.url + '">' + item.title + '</a></span>';
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
            let createdtimestamp = result.created * 1000;
            let datecreation = new Date(createdtimestamp).toLocaleDateString(document.documentElement.lang, {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            let timecreation = new Date(createdtimestamp).toLocaleTimeString(document.documentElement.lang);

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
                    // Set focus on button back to list.
                    $(SELECTORS.BACK_TO_LIST).data('noteid', result.id);
                    $(SELECTORS.BACK_TO_LIST).focus();
                    // Log viewed event.
                    promises[1].done(function() { }).fail(Notification.exception);
                    return;
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
            let tablecontainer = document.querySelector('#list-note-container');
            let tableheight = tablecontainer.offsetHeight;

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
                    paginationParts: ['pageInfo', 'pageList'],
                    paginationSuccessivelySize: 2,
                    paginationPagesBySide: 1,
                    data: data,
                    height: tableheight,
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
                                    '<a class="viewnote" data-noteid="' + row.id + '" href="#" title="' + langStrings[2] + '">',
                                    '<i class="fa fa-chevron-right" aria-hidden="true"></i>',
                                    '</a>'
                                ].join('');
                            }
                        }]
                    ],
                    onSearch: function() {
                        closeNoteListActions();
                    },
                    onPostBody: function() {
                        displayAddNoteButton();
                        // Wrap the second and the third card view for Flexbox.
                        $(".card-views").each(function() {
                            $(this).find('.card-view').slice(1, 3).wrapAll('<div class="item-content" />');
                        });
                    }
                });
            }).fail(notification.exception);
        }).fail(Notification.exception);
    };

    /**
     * Display add note button.
     *
     */
    var displayAddNoteButton = () => {
        if (!$(SELECTORS.NOTE_TABLE_CONTAINER).find('.fixed-table-container .addnote').length) {
            let addnotebtn = $(SELECTORS.ADD_BUTTON_TO_CLONE).clone().removeClass('hidden');
            $(SELECTORS.NOTE_TABLE_CONTAINER).find('.fixed-table-container').append(addnotebtn);

            // Add note click event .
            addnotebtn.on('click', function() {
                $(SELECTORS.DRAWER).removeClass('list').addClass('add');
                resetNoteForm();
                toggleNoteForm('show');
                closeNoteListActions();
            });
        }
    };

    /**
     * Close note list actions.
     */
    var closeNoteListActions = () => {
        if (!$(SELECTORS.NOTE_LIST_ACTIONS).hasClass('hidden')) {
            $(SELECTORS.CLOSE_NOTE_LIST_ACTIONS).trigger('click');
        }
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
            $(SELECTORS.DRAWER + ' ' + SELECTORS.CHECKBOX_LIST_NOTE + ':checked').each(function() {
                list.push($(this).val());
            });
            $(SELECTORS.CONFIRM_DELETE_BUTTON_MULTI).data('noteid', list);
            $('#hidden_input_for_confirm_delete_button').val(list);
            $('#hidden_input_for_confirm_delete_action').val('confirm-delete-multiple');
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
            $('#hidden_input_for_confirm_delete_button').val($(SELECTORS.HEADER_NOTE_DELETE).data('noteid'));
            $('#hidden_input_for_confirm_delete_action').val('confirm-delete-single');
            $(SELECTORS.CONFIRM_DELETE_BUTTON_SINGLE).focus();
        }
    };

    /**
     * Hide the notebook drawer.
     *
     * @param {Object} root The notebook drawer container.
     */
    var hide = (root) => {
        var drawerRoot = getDrawerRoot(root);
        if (drawerRoot.length) {
            Drawer.hide(drawerRoot);
        }
    };

    /**
     * Check if the drawer is visible.
     *
     * @param {Object} root The notebook drawer container.
     * @return {boolean}
     */
    var isVisible = (root) => {
        var drawerRoot = getDrawerRoot(root);
        if (drawerRoot.length) {
            return Drawer.isVisible(drawerRoot);
        }
        return true;
    };

    /**
     * Set Jump from button
     *
     * @param {String} buttonid The originating button id
     */
    var setJumpFrom = (buttonid) => {
        $(SELECTORS.DRAWER).attr('data-origin', buttonid);
    };

    /**
     * Find the root element of the drawer based on the using the drawer content root's ID.
     *
     * @param {Object} contentRoot The drawer content's root element.
     * @returns {*|jQuery}
     */
    var getDrawerRoot = (contentRoot) => {
        contentRoot = $(contentRoot);
        return contentRoot.closest('[data-region="right-hand-notebook-drawer"]');
    };

    /**
     * Submit form ajax.
     * @return {boolean}
     */
    var submitFormAjax = () => {
        if ($(document.activeElement).data('action') == 'reset') {
            resetNoteForm();
        } else {
            // Add an extra check in case one of the input is empty
            if (isEmpty()) {
                toggleSaveButton();
                return;
            }
            let args = {};
            let update = false;
            let service = 'local_notebook_add_note';
            let noteid = $(SELECTORS.NOTE_FORM + ' input[name="noteid"]').val();
            if (noteid !== '0') {
                update = true;
                service = 'local_notebook_update_note';
                args.noteid = noteid;
            } else {
                args.userid = this.userid;
                args.courseid = this.courseid;
                args.coursemoduleid = this.coursemoduleid;
            }
            args.subject = $(SELECTORS.NOTE_FORM + ' input[name="subject"]').val();
            args.note = $(SELECTORS.NOTE_SUMMARY).val();
            args.itemid = $(SELECTORS.NOTE_ITEMID).val();
            ajax.call([{
                methodname: service,
                args: args,
                done: function(result) {
                    if (result) {
                        var noteid = args.noteid;
                        if (!update) {
                            noteid = result;
                            delete args.subject;
                            delete args.note;
                            delete args.noteid;
                            delete args.itemid;
                            ajax.call([{
                                methodname: 'local_notebook_get_form_subject',
                                args: args,
                                done: function(subject) {
                                    if (subject) {
                                        // Set new subject.
                                        $(SELECTORS.NOTE_FORM + ' input[name="subjectorigin"]').val(subject);
                                        // Reset form.
                                        resetNoteForm();
                                        // Display success message.
                                        displayMessageSuccess('notesaved');
                                        // Refresh list.
                                        refreshNotes();
                                    }
                                },
                                fail: notification.exception
                            }]);
                        } else {
                            // Reset form.
                            resetNoteForm();
                            // Display success message.
                            displayMessageSuccess('notesaved');
                            // Refresh list.
                            refreshNotes();
                        }

                        // Display note.
                        displayNote(noteid);
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
        let action = $('#hidden_input_for_confirm_delete_action').val();
        let notesids = [];
        let keymessage = 'notedeleted';
        let id = $('#hidden_input_for_confirm_delete_button').val();
        if (action === 'confirm-delete-multiple') {
            notesids = id.split(',');
            keymessage = 'notedeletedmultiple';
        } else {
            notesids.push(id);
        }
        ajax.call([{
            methodname: 'local_notebook_delete_notes',
            args: {notes: notesids},
            done: function(result) {
                if (result) {
                    // Close dialogue.
                    closeConfirmDialogue('multiple', false);
                    if (action === 'confirm-delete-single') {
                        toggleNoteForm('hide');
                        hideNoteView(false);
                    }
                    // Display success message.
                    displayMessageSuccess(keymessage);

                    // Hide note list actions.
                    if (action === 'confirm-delete-multiple') {
                        $(SELECTORS.NOTE_LIST_ACTIONS).addClass('hidden');
                        toggleNoteListFooter('show');
                    }

                    // Set list mode.
                    $(SELECTORS.DRAWER).removeClass('view').addClass('list');

                    // Refresh list.
                    refreshNotes();
                }
            },
            fail: notification.exception
        }]);
        return false;
    };

    /**
     * Reset form.
     *
     */
    var resetNoteForm = () => {
        $(SELECTORS.NOTE_FORM + ' input[name="subject"]').val($(SELECTORS.NOTE_FORM + ' input[name="subjectorigin"]').val());
        $(SELECTORS.NOTE_FORM + ' textarea').val('');
        if (isTinyMceEditor()) {
            getTinyMce().setContent('');
            getTinyMce().on('FullscreenStateChanged', updateStylesInFullscreen);
        } else {
            $(SELECTORS.BODY_CONTAINER + " #id_notebook_editoreditable").html('');
        }
        $(SELECTORS.NOTE_FORM + ' textarea').trigger('change');
        $(SELECTORS.NOTE_FORM + ' input[name="noteid"]').val(0);
        // Remove message success if exist.
        $(SELECTORS.MESSAGE_SUCCESS_CONTAINER).html('');

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
    * Update Drawer CSS styles for TinyMCE full screen mode
    * @param {Type} event
    */
    function updateStylesInFullscreen(event) {
        // Check if TinyMCE is in fullscreen mode
        let isFullscreen = event.state;
        let $drawer = $('[data-region="right-hand-notebook-drawer"].drawer');
        if (isFullscreen) {
            // CSS styles to apply when TinyMCE is in full screen mode
            $drawer.css({
                'zIndex': '1040',
                'width': '100%',
                'top': '0px'
            });
        } else {
            // Restore default styles here
            $drawer.css({
                'zIndex': '1020',
                'width': '576px',
                'top': '60px'
            });
        }
    }

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
        $(SELECTORS.BODY_LIST).removeClass('hidden');
        $(SELECTORS.BODY_LIST).removeAttr('aria-hidden');
        // Set focus back to last item clicked.
        if (!focus) {
            return;
        }
        $(focus).focus();
    };

    /**
     * Display note view.
     */
    var displayNoteView = () => {
        $(SELECTORS.DRAWER).removeClass('list add edit').addClass('view');
        $(SELECTORS.HEADER_NOTE_VIEW).removeClass('hidden');
        $(SELECTORS.HEADER_NOTE_VIEW).removeAttr('aria-hidden');
        $(SELECTORS.FOOTER_NOTE_VIEW).removeClass('hidden');
        $(SELECTORS.FOOTER_NOTE_VIEW).removeAttr('aria-hidden');
        $(SELECTORS.NOTE_VIEW).removeClass('hidden');
        $(SELECTORS.NOTE_VIEW).removeAttr('aria-hidden');
        $(SELECTORS.BODY_LIST).addClass('hidden');
        $(SELECTORS.BODY_LIST).attr('aria-hidden', true);
        $(SELECTORS.NOTE_TABLE_CONTAINER).addClass('hidden');
    };

    /**
     * Toggle note form.
     *
     * @param {String} action show or hide
     */
    var toggleNoteForm = (action) => {
        if (action === 'show') {
            // Enable/disable save button.
            toggleSaveButton();
            if (!editorListenersInitialized) {
                if (isTinyMceEditor()) {
                    getTinyMce().on('KeyUp', toggleSaveButton);
                    getTinyMce().on('ExecCommand', toggleSaveButton);
                } else {
                    $(SELECTORS.BODY_CONTAINER + ' form textarea').on('change', toggleSaveButton);
                }
                $(SELECTORS.BODY_CONTAINER + ' form input[type="text"]').on('input', toggleSaveButton);
            }
            editorListenersInitialized = true;
            $(SELECTORS.NOTE_LIST_CONTAINER).removeClass('h-100');
            $(SELECTORS.NOTE_TABLE_CONTAINER).addClass('hidden');
            $(SELECTORS.NOTE_FORM_CONTAINER).removeClass('hidden');
        } else {
            $(SELECTORS.NOTE_LIST_CONTAINER).addClass('h-100');
            $(SELECTORS.NOTE_TABLE_CONTAINER).removeClass('hidden');
            $(SELECTORS.NOTE_FORM_CONTAINER).addClass('hidden');
        }
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
                    $(SELECTORS.DRAWER).removeClass('view').addClass('edit');
                    if (isTinyMceEditor()) {
                        getTinyMce().setContent(result.summary);
                        getTinyMce().on('FullscreenStateChanged', updateStylesInFullscreen);
                    } else {
                        $(SELECTORS.BODY_CONTAINER + " #id_notebook_editoreditable").html(result.summary);
                    }
                    $(SELECTORS.NOTE_FORM + ' textarea').val($(SELECTORS.NOTE_VIEW + ' .textareaorigin').val());
                    $(SELECTORS.NOTE_FORM + ' textarea').trigger('change');
                    $(SELECTORS.NOTE_FORM + ' input[name="subject"]').val(result.subject);
                    $(SELECTORS.NOTE_FORM + ' input[name="noteid"]').val(noteid);
                    hideNoteView(SELECTORS.NOTE_FORM + ' input[name="subject"]');
                    toggleSaveButton();
                    toggleNoteForm('show');
                    $(SELECTORS.DRAWER).removeClass('view').addClass('edit');
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
            : $(SELECTORS.BODY_CONTAINER + " #id_notebook_editoreditable").html();
        let emptyTitle = $(SELECTORS.NOTE_FORM + ' input[type="text"]').val() == '';
        let emptyEditor = editorcontent !== undefined && editorcontent.replace(/<(.|\n)*?>/g, '').trim().length === 0
        && !editorcontent.includes("<img");
        return emptyTitle || emptyEditor;
    };

    /**
     * Toggle note list footer (pagination/ seeAll link).
     *
     * @param {String} action show or hide
     */
    var toggleNoteListFooter = (action) => {
        if (action === 'hide') {
            $(SELECTORS.TABLE_PAGINATION).addClass('invisible');
            $(SELECTORS.SEEALL_CONTAINER).addClass('invisible');
        } else {
            $(SELECTORS.TABLE_PAGINATION).removeClass('invisible');
            $(SELECTORS.SEEALL_CONTAINER).removeClass('invisible');
        }
    };

    /**
     * Toggle Note list actions.
     *
     */
    var toggleNoteListActions = () => {
        let selectednotecount = $(SELECTORS.DRAWER + ' ' + SELECTORS.CHECKBOX_LIST_NOTE + ':checked').length;

        if (selectednotecount) {
            let arialabel = selectednotecount + ' ' + $(SELECTORS.SELECTED_NOTE_COUNT).attr('data-arialabel');
            $(SELECTORS.MESSAGE_SUCCESS_CONTAINER).empty();
            $(SELECTORS.SELECTED_NOTE_COUNT).text(selectednotecount);
            $(SELECTORS.SELECTED_NOTE_COUNT).attr('aria-label', arialabel);
            toggleNoteListFooter('hide');
            $(SELECTORS.NOTE_LIST_ACTIONS).removeClass('hidden');
        } else {
            toggleNoteListFooter('show');
            $(SELECTORS.NOTE_LIST_ACTIONS).addClass('hidden');
        }
    };

    /**
     * Listen to showing and hiding the notebook drawer.
     *
     * @param {Object} root The notebook drawer container.
     * @param {String} userid The user ID
     * @param {String} courseid The course ID
     * @param {String} coursemoduleid The cours module ID
     */
    var registerEventListeners = (root, userid, courseid, coursemoduleid) => {
        this.userid = userid;
        this.courseid = courseid;
        this.coursemoduleid = coursemoduleid;
        this.$table = $(SELECTORS.NOTE_TABLE);
        $(SELECTORS.DRAWER).on('click', SELECTORS.REFRESH_BUTTON, function() {
            refreshNotes();
        });
        CustomEvents.define(root, [CustomEvents.events.activate]);

        // Init state of the notebook button
        notebookButtonHandleOffset();
        // Add event listener when the drawer is toggled
        require(['theme_boost/drawers'], (Drawers) => {
            $(document).on(Drawers.eventTypes.drawerShown, () => notebookButtonHandleOffset());
            $(document).on(Drawers.eventTypes.drawerHidden, () => notebookButtonHandleOffset());
        });

        PubSub.subscribe(Events.SHOW, function() {
            show(root);
        });

        PubSub.subscribe(Events.HIDE, function() {
            hide(root);
        });

        PubSub.subscribe(Events.TOGGLE_VISIBILITY, function(buttonid) {
            if (isVisible(root)) {
                hide(root);
                $(SELECTORS.JUMPTO).attr('tabindex', -1);
                FormChangeChecker.watchFormById(SELECTORS.NOTE_FORM_ID);
                FormChangeChecker.resetAllFormDirtyStates();
            } else {
                show(root);
                setJumpFrom(buttonid);
                $(SELECTORS.JUMPTO).attr('tabindex', 0);
            }
        });

        $(SELECTORS.JUMPTO).on('focus', function() {
            var firstInput = root.find(SELECTORS.CLOSE_BUTTON);
            if (firstInput.length) {
                firstInput.focus();
            } else {
                $(SELECTORS.HEADER_CONTAINER).find(SELECTORS.ROUTES_BACK).focus();
            }
        });

        $(SELECTORS.DRAWER).focus(function() {
            var button = $(this).attr('data-origin');
            if (button) {
                $('#' + button).focus();
            }
        });

        var closebutton = root.find(SELECTORS.CLOSE_BUTTON);
        closebutton.on(CustomEvents.events.activate, function(e, data) {
            data.originalEvent.preventDefault();
            var button = $(SELECTORS.DRAWER).attr('data-origin');
            if (button) {
                $('#' + button).focus();
            }
            PubSub.publish(Events.TOGGLE_VISIBILITY);
        });

        // Back to list.
        $(SELECTORS.DRAWER).on('click', SELECTORS.BACK_TO_LIST, function() {
            toggleNoteForm('hide');
            hideNoteView(SELECTORS.VIEW_NOTE + '[data-noteid="' + $(this).data('noteid') + '"]');
            $(SELECTORS.DRAWER).removeClass('view').addClass('list');
        });

        // Note table row click event.
        $(SELECTORS.DRAWER).on('click', SELECTORS.NOTE_TABLE_ROW + ' td:not(:first-child)', function(e) {
            if (!$(e.target).hasClass('context-note') &&
                !$(e.target).parent().hasClass('context-note')) {
                let noteid = $(this).closest('tr').find('.viewnote').data('noteid');
                displayNote(noteid);
                closeNoteListActions();
            }
        });
        // Note table row checkbox cell click event.
        $(SELECTORS.DRAWER).on('click', SELECTORS.NOTE_TABLE_ROW + ' td:first-child', function(e) {
            if ($(this).find('.card-views').length) { // Card view mode.
                if (!$(e.target).is('label, input') &&
                    !$(e.target).hasClass('context-note') &&
                    !$(e.target).parent().hasClass('context-note')) {
                    let noteid = $(this).closest('tr').find('.viewnote').data('noteid');
                    displayNote(noteid);
                    closeNoteListActions();
                }
            } else {
                $(this).find('input[type="checkbox"]').trigger('click');
            }
        });
        // Edit note.
        $(SELECTORS.DRAWER).on('click', SELECTORS.HEADER_NOTE_EDIT, function() {
            editNoteView($(this).data('noteid'));
        });
        // Cancel add/dit note.
        $(SELECTORS.DRAWER).on('click', SELECTORS.CANCEL_BUTTON, function(e) {
            e.preventDefault();
            if ($(SELECTORS.DRAWER).hasClass('edit')) {
                let noteid = $(SELECTORS.HEADER_NOTE_EDIT).data('noteid');
                displayNote(noteid);
            } else {
                toggleNoteForm('hide');
                $(SELECTORS.DRAWER).removeClass('add').addClass('list');
            }
        });
        // Cancel delete note.
        $(SELECTORS.DRAWER).on('click', SELECTORS.CANCEL_DELETE_BUTTON_SINGLE, function() {
            closeConfirmDialogue('single', true);
        });
        $(SELECTORS.DRAWER).on('click', SELECTORS.CANCEL_DELETE_BUTTON_MULTI, function() {
            closeConfirmDialogue('multiple', true);
        });
        // Delete note button.
        $(SELECTORS.DRAWER).on('click', SELECTORS.DELETE_NOTE_BUTTON, function() {
            let action = 'multiple';
            if ($(this).data('noteid')) {
                action = 'single';
            }
            showConfirmDialogue(action);
        });
        // Confirm delete note button.
        $(SELECTORS.DRAWER).on('click', SELECTORS.CONFIRM_DELETE_BUTTON_SINGLE + ' , ' + SELECTORS.CONFIRM_DELETE_BUTTON_MULTI,
            submitDeleteAjax);
        // If notebook drawer is visible and we open message drawer, hide notebook.
        var msdrawerRoot = Drawer.getDrawerRoot($('[data-region="message-drawer"]'));
        var messagetoggler = $('[id^="message-drawer-toggle-"]');
        messagetoggler.on('click keydown keypress', function() {
            var keycode = (event.keyCode ? event.keyCode : event.which);
            // Enter, space or click.
            if (keycode == '13' || keycode == '32' || event.type == 'click') {
                if (Drawer.isVisible(msdrawerRoot) && isVisible(root)) {
                    hide(root);
                }
            }
        });

        $(SELECTORS.BODY_CONTAINER).on('submit', 'form', submitFormAjax);

        // Enable/disbled delete button.
        $(SELECTORS.DRAWER).on('change', SELECTORS.CHECKBOX_LIST_NOTE + ', ' + SELECTORS.CHECKBOX_ALL_NOTE,
            toggleNoteListActions);

        // Close note list actions.
        $(SELECTORS.DRAWER).on('click', SELECTORS.CLOSE_NOTE_LIST_ACTIONS, function() {
            $(SELECTORS.CHECKBOX_ALL_NOTE).prop('checked', false).trigger('click');
            toggleNoteListFooter('show');
        });
    };

    /**
     * Initialise the notebook drawer.
     *
     * @param {Object} root The notebook drawer container.
     * @param {String} userid The user ID
     * @param {String} courseid The course ID
     * @param {String} coursemoduleid The cours module ID
     */
    var init = (root, userid, courseid, coursemoduleid) => {
        root = $(root);
        registerEventListeners(root, userid, courseid, coursemoduleid);
    };

    /**
     * Handle the position of the notebook button when the right drawer is opened
     */
    var notebookButtonHandleOffset = () => {
        let notebookButton = $('.notebookbutton');
        let rightDrawer = $('#theme_boost-drawers-blocks');
        if (notebookButton.length && rightDrawer.length) {
            notebookButton.toggleClass('drawer-right-opened', rightDrawer.hasClass('show'));
        }
    };

    return {
        init: init,
    };
});
