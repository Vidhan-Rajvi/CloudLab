const ALLOWED_CONNECTIONS = {
  CLOUD: {
    COMPUTE: 'hosts',
    NETWORKING: 'contains',
    STORAGE: 'provides',
    DATABASE: 'hosts',
    SECURITY: 'enforces',
    'CLOUD SERVICES': 'provides',
  },
  NETWORKING: {
    COMPUTE: 'connects',
    DATABASE: 'connects',
    STORAGE: 'connects',
    NETWORKING: 'routes to',
    'CLOUD SERVICES': 'routes to',
    SECURITY: 'protected by',
  },
  'CLOUD SERVICES': {
    COMPUTE: 'balances to',
    NETWORKING: 'routes via',
    STORAGE: 'serves from',
  },
  COMPUTE: {
    DATABASE: 'queries',
    STORAGE: 'reads / writes',
    COMPUTE: 'communicates with',
    'CLOUD SERVICES': 'calls',
    NETWORKING: 'attached to',
  },
  SECURITY: {
    COMPUTE: 'secures',
    DATABASE: 'protects',
    NETWORKING: 'filters',
    STORAGE: 'authorizes',
    'CLOUD SERVICES': 'protects',
  },
  DATABASE: {
    STORAGE: 'backs up to',
  },
}

export function validateConnection(sourceNode, targetNode) {
  if (!sourceNode || !targetNode) {
    return { valid: false, reason: 'Both source and target resources are required.' }
  }

  if (sourceNode.id === targetNode.id) {
    return { valid: false, reason: 'A resource cannot connect to itself.' }
  }

  const sourceCategory = (sourceNode.data?.category || '').toUpperCase()
  const targetCategory = (targetNode.data?.category || '').toUpperCase()

  const allowedTargets = ALLOWED_CONNECTIONS[sourceCategory]
  if (!allowedTargets || !allowedTargets[targetCategory]) {
    return {
      valid: false,
      reason: `Cannot connect ${sourceNode.data?.label || sourceCategory} (${sourceCategory}) directly to ${targetNode.data?.label || targetCategory} (${targetCategory}).`,
    }
  }

  return {
    valid: true,
    label: allowedTargets[targetCategory],
  }
}
