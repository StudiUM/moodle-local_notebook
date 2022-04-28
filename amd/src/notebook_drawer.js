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
            REFRESH_BUTTON: 'button[name="refresh"]'
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
                if (height < 700) {
                    tableheight = 350;
                } else if (height < 600) {
                    tableheight = 300;
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
                        ]
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
