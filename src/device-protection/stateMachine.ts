import { DeviceProtectionState, StateMachineEvent } from './types';

export function transitionState(
  currentState: DeviceProtectionState,
  event: StateMachineEvent
): DeviceProtectionState {
  switch (event.type) {
    case 'APP_INITIALIZED': {
      if (event.cachedState) {
        return event.cachedState;
      }
      return currentState;
    }

    case 'SERVER_AUTHORIZED': {
      // Explicit server-signed authorization always authorizes
      return 'AUTHORIZED';
    }

    case 'SERVER_REJECTED': {
      // Server explicitly rejected this device
      return 'BLOCKED';
    }

    case 'NETWORK_OFFLINE':
    case 'SERVER_UNAVAILABLE': {
      // MANDATORY CRITICAL RULE:
      // A BLOCKED or REPLACEMENT_REQUIRED device MUST NEVER BE UNLOCKED BY NETWORK LOSS
      if (currentState === 'BLOCKED') {
        return 'BLOCKED';
      }
      if (currentState === 'REPLACEMENT_REQUIRED') {
        return 'REPLACEMENT_REQUIRED';
      }

      // Previously authorized devices keep offline access
      if (currentState === 'AUTHORIZED' || currentState === 'TEMPORARY_SERVER_UNAVAILABLE') {
        return 'TEMPORARY_SERVER_UNAVAILABLE';
      }

      // Unverified new installation goes into pending verification
      return 'PENDING_VERIFICATION';
    }

    case 'USER_REPLACED_DEVICE': {
      return 'AUTHORIZED';
    }

    case 'RESET_LICENSE': {
      return 'UNKNOWN';
    }

    default:
      return currentState;
  }
}
