import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Vector3,
} from "three";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  applyFacadeOcclusion,
  collectCameraOccludingFacades,
  resolveFacadeCameraDistance,
} from "@/lib/world/camera-facade-occlusion";

function createFacade(name: string, position: readonly [number, number, number]) {
  const facade = new Group();
  facade.name = name;
  facade.position.set(...position);
  facade.add(new Mesh(new BoxGeometry(3, 4, 1), new MeshBasicMaterial()));
  facade.updateMatrixWorld(true);
  return facade;
}

function createFrontFacingFacade(
  name: string,
  position: readonly [number, number, number],
) {
  const facade = new Group();
  facade.name = name;
  facade.position.set(...position);
  facade.add(new Mesh(new PlaneGeometry(3, 4), new MeshBasicMaterial()));
  facade.updateMatrixWorld(true);
  return facade;
}

describe("camera facade occlusion", () => {
  it("pulls the camera in before its requested path enters a facade shell", () => {
    const blockingFacade = createFacade("facade-blocking", [0, 1.5, 2.5]);

    const resolvedDistance = resolveFacadeCameraDistance({
      facades: [blockingFacade],
      requestedDistance: 6,
      requestedPosition: new Vector3(0, 1.5, 6),
      target: new Vector3(0, 1.5, 0),
    });

    expect(resolvedDistance).toBeCloseTo(1.9);
  });

  it("does not pull the camera in for a facade behind the player target", () => {
    const behindTargetFacade = createFacade("facade-behind", [0, 1.5, -2.5]);

    const resolvedDistance = resolveFacadeCameraDistance({
      facades: [behindTargetFacade],
      requestedDistance: 6,
      requestedPosition: new Vector3(0, 1.5, 6),
      target: new Vector3(0, 1.5, 0),
    });

    expect(resolvedDistance).toBe(6);
  });

  it("falls back to the minimum camera distance when the target starts inside a facade", () => {
    const enclosingFacade = createFacade("facade-enclosing", [0, 1.5, 0]);

    const resolvedDistance = resolveFacadeCameraDistance({
      facades: [enclosingFacade],
      minimumDistance: 1.25,
      requestedDistance: 6,
      requestedPosition: new Vector3(0, 1.5, 6),
      target: new Vector3(0, 1.5, 0),
    });

    expect(resolvedDistance).toBe(1.25);
  });

  it("hides only a facade that blocks the camera-to-player sight line", () => {
    const blockingFacade = createFacade("facade-blocking", [0, 1.5, 2.5]);
    const sideFacade = createFacade("facade-side", [4, 1.5, 2.5]);
    const behindPlayerFacade = createFacade("facade-behind", [0, 1.5, -2.5]);
    const facades = [blockingFacade, sideFacade, behindPlayerFacade];

    const occluding = collectCameraOccludingFacades({
      cameraPosition: new Vector3(0, 1.5, 6),
      facades,
      target: new Vector3(0, 1.5, 0),
    });

    expect(occluding).toEqual([blockingFacade]);

    applyFacadeOcclusion(facades, occluding);

    expect(blockingFacade.visible).toBe(false);
    expect(sideFacade.visible).toBe(true);
    expect(behindPlayerFacade.visible).toBe(true);
  });

  it("hides the union of facades that block the player or a nearby character", () => {
    const playerFacade = createFacade("facade-player", [0, 1.5, 2.5]);
    const characterFacade = createFacade("facade-character", [4, 1.5, 2.5]);
    const sideFacade = createFacade("facade-side", [-4, 1.5, 2.5]);
    const facades = [playerFacade, characterFacade, sideFacade];

    const occluding = collectCameraOccludingFacades(
      {
        cameraPosition: new Vector3(0, 1.5, 6),
        facades,
        target: new Vector3(0, 1.5, 0),
        targets: [new Vector3(4, 1.5, 0)],
      } as Parameters<typeof collectCameraOccludingFacades>[0] & {
        targets: readonly Vector3[];
      },
    );

    expect(occluding).toEqual([playerFacade, characterFacade]);
  });

  it("hides a facade that blocks the investigator's head even when the torso stays clear", () => {
    const headBlockingFacade = createFacade("facade-head", [0, 2.5, 2.5]);

    const occluding = collectCameraOccludingFacades({
      cameraPosition: new Vector3(0, 0.45, 6),
      facades: [headBlockingFacade],
      target: new Vector3(0, 0.45, 0),
      targets: [new Vector3(0, 1.55, 0)],
    });

    expect(occluding).toEqual([headBlockingFacade]);
  });

  it("hides a facade when the camera begins inside its visual shell", () => {
    const enclosingFacade = createFacade("facade-enclosing", [0, 1.5, 2.5]);

    const occluding = collectCameraOccludingFacades({
      cameraPosition: new Vector3(0, 1.5, 2.5),
      facades: [enclosingFacade],
      target: new Vector3(0, 1.5, 0),
    });

    expect(occluding).toEqual([enclosingFacade]);
  });

  it("hides a front-facing facade when the camera sees its reverse side", () => {
    const reverseFacingFacade = createFrontFacingFacade(
      "facade-reverse-facing",
      [0, 1.5, 2.5],
    );

    const occluding = collectCameraOccludingFacades({
      cameraPosition: new Vector3(0, 1.5, 0),
      facades: [reverseFacingFacade],
      target: new Vector3(0, 1.5, 6),
    });

    expect(occluding).toEqual([reverseFacingFacade]);
  });

  it("runs facade occlusion after the third-person camera updates", () => {
    const source = readFileSync(
      join(process.cwd(), "components/world/scene-runtime.tsx"),
      "utf8",
    );

    expect(source).toMatch(/<CameraFacadeOcclusion[\s\S]*controllerRef/);
    expect(source.indexOf("<ThirdPersonCameraRig")).toBeLessThan(
      source.indexOf("<CameraFacadeOcclusion"),
    );
  });
});
