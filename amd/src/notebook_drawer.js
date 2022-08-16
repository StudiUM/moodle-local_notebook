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
        bootstrapTable: '/local/notebook/amd/build/bootstrap-table.min',
        bootstrapTableLocale: '/local/notebook/amd/build/bootstrap-table-locale-all.min',
        bootstrapTableLocaleMobile: '/local/notebook/amd/build/bootstrap-table-mobile.min'
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
        'bootstrapTable',
        'bootstrapTableLocale',
        'bootstrapTableLocaleMobile',
    ],
    function (
        $,
        CustomEvents,
        Drawer,
        PubSub,
        notification,
        str,
        ajax
    ) {

        var SELECTORS = {
            JUMPTO: '.notebookbutton [data-region="jumpto"]',
            DRAWER: '[data-region="right-hand-notebook-drawer"]',
            HEADER_CONTAINER: '[data-region="header-container"]',
            BODY_CONTAINER: '[data-region="body-container"]',
            CLOSE_BUTTON: '[data-action="closedrawer"]',
            NOTE_TABLE: '#notebook-table',
            REFRESH_BUTTON: 'button[name="refresh"]',
            SAVE_BUTTON: '#savenote',
            RESET_BUTTON: '#resetnote',
            NOTE_FORM_ID: 'noteform',
            NOTE_FORM: '[data-region="body-container"] #noteform',
            MESSAGE_SUCCESS_CONTAINER: '[data-region="body-container"] #fgroup_id_buttonar .col-form-label .form-label-addon'
        };
        var Events = {
            SHOW: 'notebook-drawer-show',
            HIDE: 'notebook-drawer-hide',
            TOGGLE_VISIBILITY: 'notebook-drawer-toggle',
        };


        /**
         * Show the Notebook drawer.
         *
         * @param {Object} root The notebook drawer container.
         */
        var show = function (root) {
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
        var refreshNotes = function () {
            this.$table.bootstrapTable('destroy');
            displayNotes();
        };

        /**
         * Resize editor.
         *
         */
        var resizeEditor = function () {
            let heightcontainer = $(SELECTORS.BODY_CONTAINER).outerHeight(true);
            let heightlistnote = $(SELECTORS.BODY_CONTAINER + " #list-note-container").outerHeight(true);
            let heightsubject = $(SELECTORS.BODY_CONTAINER + " #fitem_id_subject").outerHeight(true);
            let heightbutton = $(SELECTORS.BODY_CONTAINER + " [data-region='footer']").outerHeight(true);
            let heighttoolbareditor = $(SELECTORS.BODY_CONTAINER + " [role='toolbar']").outerHeight(true);
            let margin = 40;
            let heighteditor = heightcontainer - heightlistnote - heightsubject - heightbutton - heighttoolbareditor - margin;
            if (heighteditor < 100) {
                heighteditor = 100;
            }

            $(SELECTORS.BODY_CONTAINER+ " #id_noteeditable").css( {
                "min-height" : heighteditor + "px",
                "height" : heighteditor + "px",
            });
        };

        /**
         * Display notes.
         *
         */
        var displayNotes = function () {
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
                let box = document.querySelector('[data-region="right-hand-notebook-drawer"]');
                let height = box.offsetHeight;
                let tableheight = 460;
                if (height < 800) {
                    tableheight = 300;
                } else if (height < 600) {
                    tableheight = 250;
                }

                let data = [];
                promises[0].done(function (result) {
                    $.each(result, function (index, value) {
                        data.push({
                            'id': value.id,
                            'subject': value.subject,
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
                        height: tableheight,
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
                                formatter: subjectFormatter,
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
                                formatter: dateFormatter,
                                width: 110
                            },
                            {
                                field: 'operate',
                                title: '',
                                align: 'center',
                                formatter: operateFormatter
                            }]
                        ],
                        onPostBody: function() {
                            // Resize editor to the wright height.
                            resizeEditor();
                        }
                    });

                    /**
                     * Format date.
                     *
                     * @param {String} value
                     * @return {String}
                     */
                    function dateFormatter(value) {
                        var today = new Date(value * 1000).toLocaleDateString(document.documentElement.lang, {
                            day : 'numeric',
                            month : 'short',
                            year : 'numeric'
                        });
                        return today;
                    }

                    /**
                     * Format subject.
                     *
                     * @param {String} value
                     * @param {Object} row
                     * @param {Integer} index
                     * @return {String}
                     */
                    function subjectFormatter(value, row, index) {
                        // To implet when doing tags.
                        var nbclass = index % 2 === 0 ? 'wcn-1' : 'wcn-2';
                        var td = "<span class='text-truncate subject'>" + value + "</span><br>";
                        if (index % 2 === 0) {
                            td += '<span class="badge badge-info text-truncate context-note ' +
                            nbclass + '">Demo course competencies FTFT-4647</span>';
                        } else {
                            td += '<span class="badge badge-info text-truncate context-note ' +
                             nbclass + '">Demo course competencies FTFT-4647</span>';
                            td += '<span class="badge badge-info text-truncate context-note ' +
                             nbclass + '">Profil Issam Taboubi</span>';
                        }
                        return td;
                    }

                    /**
                     * Display note button.
                     *
                     */
                    function operateFormatter() {
                        return [
                            '<a class="edit" title="' + langStrings[3] + '">',
                            '<i class="fa fa-chevron-right"></i>',
                            '</a>'
                        ].join('');
                    }

                }).fail(notification.exception);
            }).fail(Notification.exception);

        };

        /**
         * Hide the notebook drawer.
         *
         * @param {Object} root The notebook drawer container.
         */
        var hide = function (root) {
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
        var isVisible = function (root) {
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
        var setJumpFrom = function (buttonid) {
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
         *
         */
        var submitFormAjax = () => {
            if ($(document.activeElement).data('action') == 'reset') {
                resetNoteForm();
            } else {
                let args = {};
                args.userid = this.userid;
                args.courseid = this.courseid;
                args.coursemoduleid = this.coursemoduleid;
                args.subject = $(SELECTORS.NOTE_FORM +' input[name="subject"]').val();
                args.note = $(SELECTORS.NOTE_FORM).serialize();
                ajax.call([{
                    methodname: 'local_notebook_add_note',
                    args: args,
                    done: function(result) {
                        if (!result.error) {
                            // Display success message.
                            displayMessageSuccess();
                            // Refresh list.
                            refreshNotes();
                        }
                    },
                    fail: notification.exception
                }]);
            }
            return false;
        };

        /**
         * Reset form.
         *
         */
        var resetNoteForm = () => {
            $(SELECTORS.NOTE_FORM +' input[name="subject"]').val($(SELECTORS.NOTE_FORM +' input[name="subjectorigin"]').val());
            $(SELECTORS.NOTE_FORM + ' textarea').val('');
            $(SELECTORS.BODY_CONTAINER+ " #id_noteeditable").html('');
            $(SELECTORS.NOTE_FORM + ' textarea').trigger('change');
            // Remove message success if exist.
            $(SELECTORS.MESSAGE_SUCCESS_CONTAINER).html('');

        };

        /**
         * Display message success.
         *
         */
        var displayMessageSuccess = () => {
            // Remove old message.
            $(SELECTORS.MESSAGE_SUCCESS_CONTAINER).html('');
            var stringkeys = [
                {
                    key: 'notesaved',
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
            });
        };

        /**
         * Toggle save button.
         *
         */
        var toggleSaveButton = () => {
            let editorcontent = $(SELECTORS.NOTE_FORM + ' textarea').val();
            let emptyeditor = false;
            if (editorcontent.replace(/<(.|\n)*?>/g, '').trim().length === 0 && !editorcontent.includes("<img")) {
                emptyeditor = true;
            }
            if ($(SELECTORS.NOTE_FORM + ' input[type="text"]').val() == '' || emptyeditor) {
                $(SELECTORS.NOTE_FORM + ' ' + SELECTORS.SAVE_BUTTON).prop('disabled', true);
            } else {
                $(SELECTORS.NOTE_FORM + ' ' + SELECTORS.SAVE_BUTTON).prop('disabled', false);
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
        var registerEventListeners = function (root, userid, courseid, coursemoduleid) {
            this.userid = userid;
            this.courseid = courseid;
            this.coursemoduleid = coursemoduleid;
            this.$table = $(SELECTORS.NOTE_TABLE);
            $(SELECTORS.DRAWER).on('click', SELECTORS.REFRESH_BUTTON, function () {
                refreshNotes();
            });
            CustomEvents.define(root, [CustomEvents.events.activate]);
            PubSub.subscribe(Events.SHOW, function () {
                show(root);
            });

            PubSub.subscribe(Events.HIDE, function () {
                hide(root);
            });

            PubSub.subscribe(Events.TOGGLE_VISIBILITY, function (buttonid) {
                if (isVisible(root)) {
                    hide(root);
                    $(SELECTORS.JUMPTO).attr('tabindex', -1);
                    // Load formchangechecker module.
                    Y.use('moodle-core-formchangechecker', () => {
                        M.core_formchangechecker.init({formid: SELECTORS.NOTE_FORM_ID});
                    });
                    Y.use('moodle-core-formchangechecker', function() {
                        M.core_formchangechecker.reset_form_dirty_state();
                    });
                } else {
                    show(root);
                    setJumpFrom(buttonid);
                    $(SELECTORS.JUMPTO).attr('tabindex', 0);
                }
            });

            $(SELECTORS.JUMPTO).on('focus', function () {
                var firstInput = root.find(SELECTORS.CLOSE_BUTTON);
                if (firstInput.length) {
                    firstInput.focus();
                } else {
                    $(SELECTORS.HEADER_CONTAINER).find(SELECTORS.ROUTES_BACK).focus();
                }
            });

            $(SELECTORS.DRAWER).focus(function () {
                var button = $(this).attr('data-origin');
                if (button) {
                    $('#' + button).focus();
                }
            });

            var closebutton = root.find(SELECTORS.CLOSE_BUTTON);
            closebutton.on(CustomEvents.events.activate, function (e, data) {
                data.originalEvent.preventDefault();
                var button = $(SELECTORS.DRAWER).attr('data-origin');
                if (button) {
                    $('#' + button).focus();
                }
                PubSub.publish(Events.TOGGLE_VISIBILITY);
            });

            // If notebook drawer is visible and we open message drawer, hide notebook.
            var msdrawerRoot = Drawer.getDrawerRoot($('[data-region="message-drawer"]'));
            var messagetoggler = $('[id^="message-drawer-toggle-"]');
            messagetoggler.on('click keydown keypress', function () {
                var keycode = (event.keyCode ? event.keyCode : event.which);
                // Enter, space or click.
                if (keycode == '13' || keycode == '32' || event.type == 'click') {
                    if (Drawer.isVisible(msdrawerRoot) && isVisible(root)) {
                        hide(root);
                    }
                }
            });

            $(SELECTORS.BODY_CONTAINER).on('submit', 'form', submitFormAjax);

            // Enable/disbled save button.
            toggleSaveButton();
            $(SELECTORS.BODY_CONTAINER + ' form input[type="text"]').on('input', toggleSaveButton);
            $(SELECTORS.BODY_CONTAINER + ' form textarea').on('change', toggleSaveButton);
        };

        /**
         * Initialise the notebook drawer.
         *
         * @param {Object} root The notebook drawer container.
         * @param {String} userid The user ID
         * @param {String} courseid The course ID
         * @param {String} coursemoduleid The cours module ID
         */
        var init = function (root, userid, courseid, coursemoduleid) {
            root = $(root);
            registerEventListeners(root, userid, courseid, coursemoduleid);
        };

        return {
            init: init,
        };
    });
