import { simpleHandoffScenario } from './simpleHandoff';
import { customerServiceRetailScenario } from './customerServiceRetail';
import { chatSupervisorScenario } from './chatSupervisor';

/**
 * Map of scenario key -> array of RealtimeAgent objects
 * @type {Record<string, import('@openai/agents/realtime').RealtimeAgent[]>}
 */
export const allAgentSets = {
  simpleHandoff: simpleHandoffScenario,
  customerServiceRetail: customerServiceRetailScenario,
  chatSupervisor: chatSupervisorScenario,
};

export const defaultAgentSetKey = 'chatSupervisor';