Feature: Tenants
  @setup
  Scenario: Create test tenants
    * table tenants 
      | name | label |
      | 'test_donnas-media' | "Donna's Media" |
    * def result = call read('tenants/tenant-create.feature') tenants
    * def created = $result[*].response

  @setup
  Scenario: Add users to tenants
    * table tenantUsers 
      | tenantName | userEmail | tenantRole
      | 'test_donnas-media' | 'test_donna@example.com' | 'tenant_admin'
      | 'test_donnas-media' | 'test_debbie@example.com' | 'tenant_user'
      | 'test_donnas-media' | 'test_daisy@example.com' | 'tenant_user'
    * def result = call read('tenants/tenant-add-user.feature') tenantUsers
    * def created = $result[*].response