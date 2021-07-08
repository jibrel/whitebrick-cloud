Feature:

  Background:
    * url baseUrl
    * path endpointPath
    * configure readTimeout = 600000

  Scenario: Add all existing tables
    Given text query = 
    """
      mutation ($schemaName: String!){
        wbAddAllExistingTables(schemaName: $schemaName)
      }
    """
    And def variables = { schemaName: "#(schemaName)"}
    And request { query: "#(query)", variables: "#(variables)" }
    And header X-Test-User-Email = "test_donna@test.whitebrick.com"
    When method POST
    Then status 200
    Then print response
    Then match response.errors == "#notpresent"