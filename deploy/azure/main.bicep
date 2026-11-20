targetScope = 'resourceGroup'

@description('Use only a location permitted by the student subscription.')
param location string = resourceGroup().location

@allowed(['Standard_D2as_v5', 'Standard_B2as_v2', 'Standard_B2s_v2'])
param vmSize string = 'Standard_D2as_v5'

@description('Availability zone (Zone 2 is available for Central India student subscription)')
param availabilityZone string = '2'

@description('A public SSH key, never the private key.')
param sshPublicKey string

@description('Administrator IPv4 address with /32. SSH is not open to the internet.')
param adminSourceCidr string

param adminUsername string = 'fittrackadmin'

resource nsg 'Microsoft.Network/networkSecurityGroups@2024-05-01' = {
  name: 'fittrack-nsg'
  location: location
  properties: {
    securityRules: [
      {
        name: 'SSH-from-admin'
        properties: {
          priority: 100
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: adminSourceCidr
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '22'
        }
      }
      {
        name: 'HTTPS-and-certificate-validation'
        properties: {
          priority: 110
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRanges: ['80', '443']
        }
      }
    ]
  }
}

resource vnet 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: 'fittrack-vnet'
  location: location
  properties: {
    addressSpace: { addressPrefixes: ['10.42.0.0/16'] }
    subnets: [
      {
        name: 'app'
        properties: {
          addressPrefix: '10.42.0.0/24'
          networkSecurityGroup: { id: nsg.id }
        }
      }
    ]
  }
}

resource publicIp 'Microsoft.Network/publicIPAddresses@2024-05-01' = {
  name: 'fittrack-ip'
  location: location
  sku: { name: 'Standard' }
  zones: [ availabilityZone ]
  properties: { publicIPAllocationMethod: 'Static' }
}

resource nic 'Microsoft.Network/networkInterfaces@2024-05-01' = {
  name: 'fittrack-nic'
  location: location
  properties: {
    ipConfigurations: [
      {
        name: 'primary'
        properties: {
          privateIPAllocationMethod: 'Dynamic'
          subnet: { id: '${vnet.id}/subnets/app' }
          publicIPAddress: { id: publicIp.id }
        }
      }
    ]
  }
}

resource vm 'Microsoft.Compute/virtualMachines@2024-07-01' = {
  name: 'fittrack-vm'
  location: location
  zones: [ availabilityZone ]
  properties: {
    hardwareProfile: { vmSize: vmSize }
    securityProfile: {
      securityType: 'TrustedLaunch'
      uefiSettings: { secureBootEnabled: true, vTpmEnabled: true }
    }
    osProfile: {
      computerName: 'fittrack'
      adminUsername: adminUsername
      customData: base64(loadTextContent('cloud-init.yaml'))
      linuxConfiguration: {
        disablePasswordAuthentication: true
        ssh: {
          publicKeys: [
            {
              path: '/home/${adminUsername}/.ssh/authorized_keys'
              keyData: sshPublicKey
            }
          ]
        }
      }
    }
    storageProfile: {
      imageReference: {
        publisher: 'Canonical'
        offer: 'ubuntu-24_04-lts'
        sku: 'server'
        version: 'latest'
      }
      osDisk: {
        name: 'fittrack-os-data'
        createOption: 'FromImage'
        diskSizeGB: 64
        managedDisk: { storageAccountType: 'StandardSSD_LRS' }
        deleteOption: 'Detach'
      }
    }
    networkProfile: { networkInterfaces: [{ id: nic.id }] }
    diagnosticsProfile: { bootDiagnostics: { enabled: true } }
  }
}

output publicAddress string = publicIp.properties.ipAddress
output sshCommand string = 'ssh ${adminUsername}@${publicIp.properties.ipAddress}'
