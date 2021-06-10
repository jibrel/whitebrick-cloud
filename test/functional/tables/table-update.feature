Feature:

  Background:
    * url baseUrl
    * path endpointPath
    
  Scenario: Re-name or re-label a table
    Given text query = 
    """
      mutation ($schemaName: String!, $tableName: String!, $newTableName: String, $newTableLabel: String){
        wbUpdateTable(schemaName: $schemaName, tableName: $tableName, newTableName: $newTableName)
      }
    """
    And def variables = { schemaName: '#(schemaName)', tableName: '#(tableName)', newTableName: '#(newTableName)', newTableLabel: '#(newTableLabel)'}
    And request { query: '#(query)', variables: '#(variables)' }
    When method POST
    Then status 200
    Then print response
    Then match response.errors == '#notpresent'