/**
 * Notebook component.
 *
 * @module     local_notebook/notebook
 * @copyright  2022 Université de Montréal
 * @author     Issam Taboubi <issam.taboubi@umontreal.ca>
 */
define(
[ 'jquery', 'core/ajax', 'core/templates', 'core/str', 'core/notification',],
function($, ajax, templates, str, notification) {

    var notebook = {
        pagewrapperselector: "#page-wrapper",
        /**
         * Initialise the notebook for the current page.
         *
         * @method  init
         */
        init: function() {
            notebook.displaybutton();
        },
        /**
         * Dispplay button
         *
         * @method displaybutton
         */
        displaybutton: function() {
            templates.render('local_notebook/notebookbutton', {})
            .then(function(html, js) {
                templates.prependNodeContents($(notebook.pagewrapperselector), html, js);
                return;
            })
            .fail(notification.exception);
        }
    };

    return /** @alias module:local_notebook/notebook */ {
        /**
         * Initialise the the notebook for the current page.
         *
         * @method  init
         */
        init: notebook.init
    };
});
