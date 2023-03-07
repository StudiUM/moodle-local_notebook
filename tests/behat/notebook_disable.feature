@local_notebook @javascript
Feature: Notebook can be disabled
  In order to ensure we can disable notebook
  As an admin
  I need to be able to set a configuration that will disable it

  Background:
    Given I log in as "admin"

  Scenario: Disabling notebook hides drawer
    And "Open my notebook" "button" should be visible
    And I navigate to "Plugins > Local plugins > Notebook settings" in site administration
    And I click on "Enabled" "checkbox"
    And I press "Save changes"
    And "Open my notebook" "button" should not be visible

  Scenario: Disabling notebook disable access to index page
    And I visit "/local/notebook/index.php"
    And I should not see "Notebook has either been disabled or you do not have access to this page."
    And I navigate to "Plugins > Local plugins > Notebook settings" in site administration
    And I click on "Enabled" "checkbox"
    And I press "Save changes"
    And I visit "/local/notebook/index.php"
    And I should see "Notebook has either been disabled or you do not have access to this page."
