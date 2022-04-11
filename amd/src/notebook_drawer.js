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
define(
[
    'jquery',
    'core/custom_interaction_events',
    'core/drawer',
    'core/pubsub'
],
function(
    $,
    CustomEvents,
    Drawer,
    PubSub
) {

    var SELECTORS = {
        JUMPTO: '.notebookbutton [data-region="jumpto"]',
        DRAWER: '[data-region="right-hand-notebook-drawer"]',
        HEADER_CONTAINER: '[data-region="header-container"]',
        BODY_CONTAINER: '[data-region="body-container"]',
        CLOSE_BUTTON: '[data-action="closedrawer"]'
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
    var show = function(root) {
        if (!root.attr('data-shown')) {
            root.attr('data-shown', true);
        }

        var drawerRoot = getDrawerRoot(root);
        if (drawerRoot.length) {
            Drawer.show(drawerRoot);
        }
    };

    /**
     * Hide the notebook drawer.
     *
     * @param {Object} root The notebook drawer container.
     */
    var hide = function(root) {
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
    var isVisible = function(root) {
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
    var setJumpFrom = function(buttonid) {
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
     */
    var registerEventListeners = function(root) {
        CustomEvents.define(root, [CustomEvents.events.activate]);
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

        // If notebook draer is visible and we open message drawer, hide notebook.
        var msdrawerRoot = Drawer.getDrawerRoot($('[data-region="message-drawer"]'));
        var messagetoggler = $('[id^="message-drawer-toggle-"]');
        messagetoggler.on('click keydown keypress', function() {
            var keycode = (event.keyCode ? event.keyCode :  event.which);
            // Enter, space or click.
            if(keycode == '13' || keycode == '32' || event.type == 'click'){
                if(Drawer.isVisible(msdrawerRoot) && isVisible(root)) {
                    hide(root);
                }
            }
        });
    };

    /**
     * Initialise the notebook drawer.
     *
     * @param {Object} root The notebook drawer container.
     */
    var init = function(root) {
        root = $(root);
        registerEventListeners(root);
    };

    return {
        init: init,
    };
});
