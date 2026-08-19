import type {
  Attraction,
  AttractionStatus,
  LiveAttraction,
  Operator,
  OperatorRole,
  ParkEvent,
} from "./types";

export function canSeeLiveBoard(role: OperatorRole): boolean {
  return role === "ride_ops" || role === "supervisor" || role === "guest_wall";
}

export function canSeeInternalLiveData(role: OperatorRole): boolean {
  return role === "ride_ops" || role === "supervisor";
}

export function canCreateAttraction(role: OperatorRole): boolean {
  return role === "supervisor";
}

export function canUpdateAttractionMeta(role: OperatorRole): boolean {
  return role === "supervisor";
}

export function canReportPosition(
  operator: Operator,
  attraction: Pick<Attraction, "siteCode" | "unitCode">,
): boolean {
  if (operator.role === "supervisor") return true;
  if (operator.role !== "ride_ops") return false;
  if (operator.siteCode && operator.siteCode !== attraction.siteCode) {
    return false;
  }
  if (operator.unitCode && operator.unitCode !== attraction.unitCode) {
    return false;
  }
  return true;
}

export function publicStatusForRole(
  status: AttractionStatus,
  role: OperatorRole,
): AttractionStatus {
  if (canSeeInternalLiveData(role)) return status;
  if (status === "evac") return "down";
  if (status === "weather_hold") return "delayed";
  if (status === "cycling") return "open";
  return status;
}

export function redactLiveAttraction(
  attraction: LiveAttraction,
  role: OperatorRole,
): LiveAttraction {
  const publicStatus = publicStatusForRole(attraction.status, role);
  const internal = canSeeInternalLiveData(role);
  return {
    ...attraction,
    publicStatus,
    status: internal ? attraction.status : publicStatus,
    internalNotes: internal ? attraction.internalNotes : null,
    trainsOnTrack: internal ? attraction.trainsOnTrack : null,
    holdReason: internal ? attraction.holdReason : null,
    reportedById: internal ? attraction.reportedById : null,
    reportedByName: internal ? attraction.reportedByName : null,
    assignedOperatorName: internal ? attraction.assignedOperatorName : null,
    stale: internal ? attraction.stale : false,
    staleForSeconds: internal ? attraction.staleForSeconds : 0,
  };
}

export function redactEventForRole(event: ParkEvent, role: OperatorRole): ParkEvent {
  if (canSeeInternalLiveData(role)) return event;
  if (event.type === "stale_position" || event.type === "stale_cleared") {
    return {
      ...event,
      type: "position_check",
      message: "Attraction wait time refreshed",
      payload: {},
    };
  }
  if (event.type === "status_change") {
    const next = publicStatusForRole(
      String(event.payload.nextStatus ?? "open") as AttractionStatus,
      role,
    );
    return {
      ...event,
      message: `Status now ${next.replace("_", " ")}`,
      payload: { nextStatus: next },
    };
  }
  return {
    ...event,
    payload: {},
  };
}
