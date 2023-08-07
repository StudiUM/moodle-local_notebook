@local_notebook @javascript
Feature: Notebook can be disabled on all quiz attempts
  In order to ensure we can disable notebook on all quiz attempts
  As an admin
  I need to be able to set a configuration that will disable it

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email               |
      | student  | Student   | One      | student@example.com |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1        | 0        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student  | C1     | student |
    And the following "question categories" exist:
      | contextlevel | reference | name           |
      | Course       | C1        | Test questions |
    And the following "questions" exist:
      | questioncategory | qtype     | name | questiontext    |
      | Test questions   | truefalse | TF1  | First question  |
    And the following "activities" exist:
      | activity   | name   | intro              | course | idnumber |
      | quiz       | Quiz 1 | Quiz 1 description | C1     | quiz1    |
    And quiz "Quiz 1" contains the following questions:
      | question | page |
      | TF1      | 1    |

  Scenario: Disabling notebook hides drawer on any quiz attempt
    Given I log in as "admin"
    And "Open my notebook" "button" should be visible
    And I navigate to "Plugins > Local plugins > Notebook settings" in site administration
    And I click on "Enable notebook - Quiz attempts" "checkbox"
    And I press "Save changes"
    When I am on the "Quiz 1" "mod_quiz > View" page logged in as "student"
    Then "Open my notebook" "button" should be visible
    And I press "Attempt quiz"
    Then "Open my notebook" "button" should not be visible
