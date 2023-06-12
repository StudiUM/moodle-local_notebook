@local_notebook @javascript
Feature: Notebook instance tag display
  In order to ensure what a note relates to
  As a user
  I need to quickly be able to see what instance it relates to

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | teacher1 | Teacher   | 1        | teacher1@example.com |
      | student1 | Student   | 1        | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1        | 0        |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | teacher1 | C1     | editingteacher |
      | student1 | C1     | student        |
    And I log in as "teacher1"
    And I am on "Course 1" course homepage with editing mode on
    And I add a "Forum" to section "1" and I fill the form with:
      | Forum name  | Test forum name                |
      | Forum type  | Standard forum for general use |
      | Description | Test forum description         |

  Scenario: Adding a note from a course module I can see a tag note
    And I am on the "Test forum name" "forum activity" page logged in as teacher1
    And I click on "Open my notebook" "button"
    And I click on "Add note" "button"
    And I click on "id_summary_editoreditable" "region"
    And I type "Bonjour"
    And I click on "savenote" "button"
    # Getting out of course so no confusion with links.
    And I am on site homepage
    And I click on "Open my notebook" "button"
    And "C1" "link" should be visible
    And "Test forum name" "link" should be visible
    And I am on "Course 1" course homepage with editing mode on
    And I delete "Test forum name" activity
    And I run all adhoc tasks
    And I am on "Course 1" course homepage
    And I navigate to "Recycle bin" in current page administration
    And I should see "Test forum name"
    And I click on "Delete" "link" in the "region-main" "region"
    And I press "Yes"
    And I am on site homepage
    And I click on "Open my notebook" "button"
    And I should see "Test forum name"
    And I hover "//span[@title='Test forum name activity has been deleted']" "xpath_element"
