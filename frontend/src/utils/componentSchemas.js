export const DEFAULT_REGIONS = [
  'us-east-1',
  'us-west-2',
  'eu-west-1',
  'ap-south-1',
]

export function getDefaultConfig(componentId, category) {
  const cat = (category || '').toUpperCase()

  if (cat === 'COMPUTE') {
    return {
      region: 'us-east-1',
      instanceType: 't3.medium',
      vcpu: '2',
      memoryGb: '4',
      os: 'Ubuntu 24.04 LTS',
    }
  }

  if (cat === 'DATABASE') {
    const defaultPort =
      componentId === 'mysql' ? '3306' : componentId === 'redis' ? '6379' : '5432'
    return {
      region: 'us-east-1',
      dbName: 'cloudlab_db',
      port: defaultPort,
      storageGb: '50',
      multiAz: 'Disabled',
    }
  }

  if (cat === 'STORAGE') {
    return {
      region: 'us-east-1',
      bucketName: 'cloudlab-assets-bucket',
      storageClass: 'Standard',
      encryption: 'AES-256',
    }
  }

  if (cat === 'NETWORKING') {
    return {
      region: 'us-east-1',
      cidrBlock: componentId === 'subnet' ? '10.0.1.0/24' : '10.0.0.0/16',
      visibility: componentId === 'internet-gateway' ? 'Public' : 'Private',
    }
  }

  if (cat === 'SECURITY') {
    return {
      region: 'global',
      policyMode: 'Enforce',
      allowedPorts: '80, 443',
    }
  }

  if (cat === 'CLOUD SERVICES') {
    return {
      region: 'us-east-1',
      algorithm: componentId === 'load-balancer' ? 'Round Robin' : 'Edge Cache',
      listenerPort: '443',
    }
  }

  return {
    region: 'us-east-1',
    environment: 'Production',
  }
}

export function getConfigFields(category) {
  const cat = (category || '').toUpperCase()

  if (cat === 'COMPUTE') {
    return [
      {
        key: 'instanceType',
        label: 'Instance Type',
        type: 'select',
        options: ['t3.micro', 't3.small', 't3.medium', 'm5.large', 'c5.xlarge'],
      },
      { key: 'vcpu', label: 'vCPU Cores', type: 'number', min: 1, max: 64, required: true },
      { key: 'memoryGb', label: 'Memory (GB)', type: 'number', min: 1, max: 256, required: true },
      { key: 'os', label: 'Operating System', type: 'text', required: true },
    ]
  }

  if (cat === 'DATABASE') {
    return [
      { key: 'dbName', label: 'Database / Instance Name', type: 'text', required: true },
      { key: 'port', label: 'Port', type: 'number', min: 1, max: 65535, required: true },
      { key: 'storageGb', label: 'Allocated Storage (GB)', type: 'number', min: 5, max: 4096, required: true },
      {
        key: 'multiAz',
        label: 'High Availability (Multi-AZ)',
        type: 'select',
        options: ['Disabled', 'Enabled'],
      },
    ]
  }

  if (cat === 'STORAGE') {
    return [
      { key: 'bucketName', label: 'Bucket / Volume Name', type: 'text', required: true },
      {
        key: 'storageClass',
        label: 'Storage Class',
        type: 'select',
        options: ['Standard', 'Infrequent Access', 'Archive'],
      },
      {
        key: 'encryption',
        label: 'Encryption',
        type: 'select',
        options: ['AES-256', 'KMS Managed'],
      },
    ]
  }

  if (cat === 'NETWORKING') {
    return [
      { key: 'cidrBlock', label: 'CIDR Block', type: 'text', required: true },
      {
        key: 'visibility',
        label: 'Network Visibility',
        type: 'select',
        options: ['Private', 'Public'],
      },
    ]
  }

  if (cat === 'SECURITY') {
    return [
      {
        key: 'policyMode',
        label: 'Enforcement Mode',
        type: 'select',
        options: ['Enforce', 'Audit Only'],
      },
      { key: 'allowedPorts', label: 'Allowed Ports / Rules', type: 'text', required: true },
    ]
  }

  if (cat === 'CLOUD SERVICES') {
    return [
      {
        key: 'algorithm',
        label: 'Routing / Delivery Mode',
        type: 'select',
        options: ['Round Robin', 'Least Connections', 'Edge Cache'],
      },
      { key: 'listenerPort', label: 'Listener Port', type: 'number', min: 1, max: 65535, required: true },
    ]
  }

  return [
    {
      key: 'environment',
      label: 'Environment Tier',
      type: 'select',
      options: ['Development', 'Staging', 'Production'],
    },
  ]
}

export function summarizeConfig(category, config = {}) {
  const cat = (category || '').toUpperCase()
  if (cat === 'COMPUTE' && config.instanceType) {
    return `${config.instanceType} · ${config.vcpu || 2} vCPU · ${config.memoryGb || 4} GB`
  }
  if (cat === 'DATABASE' && config.port) {
    return `${config.dbName || 'db'} · Port ${config.port}`
  }
  if (cat === 'STORAGE' && config.storageClass) {
    return `${config.storageClass} · ${config.encryption || 'AES-256'}`
  }
  if (cat === 'NETWORKING' && config.cidrBlock) {
    return `${config.cidrBlock} · ${config.visibility || 'Private'}`
  }
  if (cat === 'SECURITY' && config.allowedPorts) {
    return `${config.policyMode || 'Enforce'} · Ports ${config.allowedPorts}`
  }
  if (cat === 'CLOUD SERVICES' && config.listenerPort) {
    return `${config.algorithm || 'Routing'} · Port ${config.listenerPort}`
  }
  return config.region ? `Region: ${config.region}` : 'Configured resource'
}
