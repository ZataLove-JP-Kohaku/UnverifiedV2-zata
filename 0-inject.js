// MBLX-B2B×PVP-texture-pack — inject.js
// Runs in the page's MAIN world (so it can reach the live game instance
// and patch the same module the game itself is using).
//
// Ported from minifeather-client's src/features.js and
// src/HitboxDebugColor.js. Only two features were kept:
//   - Block Highlight (recolor / thicken the block outline)
//   - Hitbox / Debug Color (recolor / thicken miniblox's own hitbox
//     debug view — this does NOT turn the debug view on, it only
//     changes how it looks while it's on)
//
// Changes from the original minifeather implementation:
//   1. Block Highlight "disabled" no longer hides the box
//      (selectBox.visible = false). It now restores miniblox's own
//      native color/thickness and leaves visibility fully under the
//      game's control, so turning it off looks exactly like vanilla
//      instead of the highlight vanishing.
//   2. Hitbox / Debug Color now supports a thickness setting too,
//      using the same duplicate-and-offset trick as Block Highlight.
//
// Settings (all read from localStorage, same keys minifeather used):
//   miniblox_blockhighlight              'true' | 'false'   (default: true)
//   miniblox_blockhighlight_color        '#rrggbb'
//   miniblox_blockhighlight_thickness    '1'-'4'
//   miniblox_hitboxdebugcolor_enabled    'true' | 'false'   (default: false)
//   miniblox_hitboxdebugcolor            '#rrggbb'
//   miniblox_hitboxdebugcolor_thickness  '1'-'4'            (new)

(function () {
    'use strict';

    const TAG = '[MBLX-TP]';

    if (window.__MBLX_TP_INJECT__) return;
    window.__MBLX_TP_INJECT__ = true;

    // ---------------------------------------------------------------
    // Shared: find the live game instance via React fiber internals.
    // ---------------------------------------------------------------
    function findGameInstance() {
        const candidates = [
            document.getElementById('root'),
            document.querySelector('canvas'),
            document.body,
            ...document.querySelectorAll('#root *')
        ];

        for (const el of candidates) {
            if (!el) continue;

            const fiberKey = Object.keys(el).find(k =>
                k.startsWith('__reactFiber$') ||
                k.startsWith('__reactInternalInstance$') ||
                k.startsWith('__reactContainer$')
            );

            if (!fiberKey) continue;

            let fiber = el[fiberKey];

            while (fiber) {
                const state = fiber.stateNode;

                if (state) {
                    if (typeof state.queue === 'function' && typeof state.connect === 'function') {
                        return state;
                    }
                    if (state.game && typeof state.game.queue === 'function' && typeof state.game.connect === 'function') {
                        return state.game;
                    }
                }

                const props = fiber.memoizedProps;

                if (props) {
                    if (props.game && typeof props.game.queue === 'function' && typeof props.game.connect === 'function') {
                        return props.game;
                    }
                    for (const key in props) {
                        const value = props[key];
                        if (value && typeof value === 'object' && typeof value.queue === 'function' && typeof value.connect === 'function') {
                            return value;
                        }
                    }
                }

                fiber = fiber.return;
            }
        }

        return null;
    }

    function getGame() {
        if (window.miniblox) return window.miniblox;
        const game = findGameInstance();
        if (game) window.miniblox = game;
        return game;
    }

    // Clamp a thickness setting to the 1-4 range used everywhere here.
    function readThickness(key) {
        const level = parseInt(localStorage.getItem(key) || '1', 10);
        return Math.max(1, Math.min(4, Number.isFinite(level) ? level : 1));
    }

    // Offset table shared by both features — small local-space nudges
    // that fake a thicker line/box by stacking several copies on top
    // of each other. Ported as-is from minifeather's Block Highlight.
    function buildOffsets(level) {
        const offsets = [];
        const d = 0.001;
        const localD = d * 2;

        if (level >= 2) {
            offsets.push(
                [localD, 0, 0], [-localD, 0, 0],
                [0, localD, 0], [0, -localD, 0],
                [0, 0, localD], [0, 0, -localD]
            );
            const d2 = localD * 0.7;
            offsets.push(
                [d2, d2, 0], [-d2, d2, 0], [d2, -d2, 0], [-d2, -d2, 0],
                [0, d2, d2], [0, -d2, d2], [0, d2, -d2], [0, -d2, -d2],
                [d2, 0, d2], [-d2, 0, d2], [d2, 0, -d2], [-d2, 0, -d2]
            );
            const d3 = localD * 1.4;
            offsets.push(
                [d3, 0, 0], [-d3, 0, 0],
                [0, d3, 0], [0, -d3, 0],
                [0, 0, d3], [0, 0, -d3]
            );
        }

        if (level >= 3) {
            const d4 = localD * 1.7;
            offsets.push(
                [d4, d4, 0], [-d4, d4, 0], [d4, -d4, 0], [-d4, -d4, 0],
                [0, d4, d4], [0, -d4, d4], [0, d4, -d4], [0, -d4, -d4],
                [d4, 0, d4], [-d4, 0, d4], [d4, 0, -d4], [-d4, 0, -d4]
            );
            const d5 = localD * 2.0;
            offsets.push(
                [d5, d5, d5], [-d5, d5, d5], [d5, -d5, d5], [-d5, -d5, d5],
                [d5, d5, -d5], [-d5, d5, -d5], [d5, -d5, -d5], [-d5, -d5, -d5]
            );
        }

        if (level >= 4) {
            const d6 = localD * 2.4;
            offsets.push(
                [d6, d6, 0], [-d6, d6, 0], [d6, -d6, 0], [-d6, -d6, 0],
                [0, d6, d6], [0, -d6, d6], [0, d6, -d6], [0, -d6, -d6],
                [d6, 0, d6], [-d6, 0, d6], [d6, 0, -d6], [-d6, 0, -d6]
            );
            const d7 = localD * 2.8;
            offsets.push(
                [d7, 0, 0], [-d7, 0, 0],
                [0, d7, 0], [0, -d7, 0],
                [0, 0, d7], [0, 0, -d7]
            );
            const d8 = localD * 3.1;
            offsets.push(
                [d8, d8, 0], [-d8, d8, 0], [d8, -d8, 0], [-d8, -d8, 0],
                [0, d8, d8], [0, -d8, d8], [0, d8, -d8], [0, -d8, -d8],
                [d8, 0, d8], [-d8, 0, d8], [d8, 0, -d8], [-d8, 0, -d8]
            );
        }

        return offsets;
    }

    // =================================================================
    // Feature 1: Block Highlight
    // =================================================================
    (function blockHighlightFeature() {
        if (window.__MBLX_TP_BLOCK_HIGHLIGHT__) return;
        window.__MBLX_TP_BLOCK_HIGHLIGHT__ = true;

        // Exact thickness technique from minifeather's inject(3).js port,
        // specific to Box3Helper (a LineSegments subclass).
        function applySelectBoxThickness(selectBox, thicknessVal, colorHex) {
            const level = parseInt(thicknessVal || '1', 10);
            if (!selectBox) return;

            if (!selectBox._thickChildren || selectBox._thickLevel !== level) {
                if (selectBox._thickChildren) {
                    selectBox._thickChildren.forEach(child => {
                        selectBox.remove(child);
                        if (child.material) child.material.dispose();
                    });
                }

                selectBox._thickChildren = [];
                selectBox._thickLevel = level;

                if (level > 1) {
                    const Box3HelperClass = selectBox.constructor;
                    const LineSegmentsClass = Object.getPrototypeOf(Box3HelperClass);
                    const LineBasicMaterialClass = selectBox.material.constructor;
                    const color = new selectBox.material.color.constructor(colorHex);

                    buildOffsets(level).forEach(offset => {
                        const material = new LineBasicMaterialClass({ color, toneMapped: false });
                        const clone = new LineSegmentsClass(selectBox.geometry, material);
                        clone.position.set(offset[0], offset[1], offset[2]);
                        selectBox.add(clone);
                        selectBox._thickChildren.push(clone);
                    });
                }
            } else {
                selectBox._thickChildren.forEach(child => {
                    if (child.material?.color) child.material.color.set(colorHex);
                });
            }
        }

        function refreshBlockHighlight() {
            try {
                const game = getGame();
                const selectBox = game?.player?.selectBox;
                if (!selectBox) return false;

                // Remember miniblox's own native color the first time we
                // see this box, so "disabled" can restore it exactly
                // instead of just hiding the box.
                if (!selectBox._mfNativeColor && selectBox.material?.color) {
                    selectBox._mfNativeColor = selectBox.material.color.clone();
                }

                const enabled = localStorage.getItem('miniblox_blockhighlight') !== 'false';

                if (!enabled) {
                    // Revert to miniblox's own block highlight instead of
                    // hiding it — restore native color/thickness and leave
                    // visibility fully under the game's control.
                    if (selectBox._mfNativeColor && selectBox.material?.color) {
                        selectBox.material.color.copy(selectBox._mfNativeColor);
                    }
                    const nativeHex = selectBox._mfNativeColor
                        ? '#' + selectBox._mfNativeColor.getHexString()
                        : '#ffffff';
                    applySelectBoxThickness(selectBox, '1', nativeHex);
                    return true;
                }

                selectBox.visible = true;

                const color = localStorage.getItem('miniblox_blockhighlight_color') || '#ffffff';
                if (selectBox.material?.color) selectBox.material.color.set(color);

                applySelectBoxThickness(selectBox, String(readThickness('miniblox_blockhighlight_thickness')), color);

                return true;
            } catch (err) {
                console.warn(`${TAG} Block Highlight refresh error:`, err);
                return false;
            }
        }

        function patchSelectMethod(module) {
            if (window.__MBLX_TP_SELECT_PATCHED__) return true;

            let proto = null;

            for (const key in module) {
                try {
                    const exp = module[key];
                    if (typeof exp === 'object' && typeof exp?.getTargetedBlockCoords === 'function') {
                        proto = Object.getPrototypeOf(exp);
                    } else if (typeof exp === 'function' && exp.prototype && typeof exp.prototype.getTargetedBlockCoords === 'function') {
                        proto = exp.prototype;
                    }
                } catch (_) {}
            }

            if (!proto || typeof proto.select !== 'function') return false;

            if (proto.select.__mbTpPatched) {
                window.__MBLX_TP_SELECT_PATCHED__ = true;
                return true;
            }

            const originalSelect = proto.select;

            const patchedSelect = function (...args) {
                const result = originalSelect.apply(this, args);
                refreshBlockHighlight();
                return result;
            };

            patchedSelect.__mbTpPatched = true;
            proto.select = patchedSelect;
            window.__MBLX_TP_SELECT_PATCHED__ = true;

            console.log(`${TAG} ✓ PlayerController.select patched.`);
            return true;
        }

        function scanBundle() {
            const script = document.querySelector('script[src*="/assets/index-"]');
            if (!script) return false;

            import(script.src)
                .then(module => {
                    if (!module) return;
                    patchSelectMethod(module);
                    refreshBlockHighlight();
                })
                .catch(err => console.warn(`${TAG} Bundle scan failed:`, err));

            return true;
        }

        window.addEventListener('message', event => {
            if (event.data?.type === 'MBLX_TP_REFRESH_BLOCK_HIGHLIGHT') {
                refreshBlockHighlight();
            }
        });

        let bundleStarted = false;

        const interval = setInterval(() => {
            if (!bundleStarted) bundleStarted = scanBundle();

            refreshBlockHighlight();

            if (bundleStarted && window.miniblox?.player?.selectBox && window.__MBLX_TP_SELECT_PATCHED__) {
                clearInterval(interval);
                console.log(`${TAG} ✓ Block Highlight ready.`);
            }
        }, 500);

        window.MBLX_TP = window.MBLX_TP || {};
        window.MBLX_TP.refreshBlockHighlight = refreshBlockHighlight;

        console.log(`${TAG} Block Highlight loaded.`);
    })();

    // =================================================================
    // Feature 2: Hitbox / Debug Color (+ thickness)
    // =================================================================
    (function hitboxDebugColorFeature() {
        if (window.__MBLX_TP_HITBOX_COLOR__) return;
        window.__MBLX_TP_HITBOX_COLOR__ = true;

        const DEFAULT_COLOR = '#ffffff';

        function getRenderer() {
            const game = getGame();
            return game?.gameScene?.debugHitboxRenderer || null;
        }

        function getHitboxUniformColor(renderer) {
            const material = renderer?.object?.material;
            const uniformColor = material?.uniforms?.color?.value;
            return uniformColor && typeof uniformColor.set === 'function' ? uniformColor : null;
        }

        // NOTE: minifeather only exposed a color uniform here, not a
        // geometry we know the shape of, so thickness is a best-effort
        // port of the same duplicate-and-offset trick Block Highlight
        // uses, generalized to clone the whole renderer object. Because
        // material/geometry references are shared by Object3D.clone(),
        // the clones automatically track color and any per-frame
        // geometry updates — but if the live renderer turns out to draw
        // every hitbox in one shared batch, thickness may look slightly
        // different than Block Highlight's. Leave thickness at 1 to
        // disable this entirely and fall back to plain recoloring.
        // Some debug-draw renderers rebuild their object's contents every
        // frame (clear-and-redraw style), which would silently detach any
        // sibling clones we added the moment the next frame runs — unlike
        // Block Highlight's selectBox, which the game keeps as one
        // persistent object. So on top of only re-cloning when the root
        // reference or thickness level changes, we also check every call
        // whether our previous clones are still actually attached, and
        // rebuild them immediately if not.
        function applyHitboxThickness(renderer, thicknessVal) {
            const level = Math.max(1, Math.min(4, parseInt(thicknessVal || '1', 10)));
            const root = renderer?.object;
            if (!root || !root.parent) return;

            const rootChanged = renderer._mfThickRoot !== root;
            const detached = !rootChanged &&
                renderer._mfThickLevel === level &&
                renderer._mfThickChildren &&
                renderer._mfThickChildren.some(child => child.parent !== root.parent);

            if (rootChanged || renderer._mfThickLevel !== level || detached) {
                if (renderer._mfThickChildren) {
                    renderer._mfThickChildren.forEach(child => {
                        child.parent?.remove(child);
                    });
                }

                renderer._mfThickChildren = [];
                renderer._mfThickRoot = root;
                renderer._mfThickLevel = level;

                if (level > 1 && typeof root.clone === 'function') {
                    buildOffsets(level).forEach(offset => {
                        try {
                            const clone = root.clone(true);
                            clone.position.x += offset[0];
                            clone.position.y += offset[1];
                            clone.position.z += offset[2];
                            root.parent.add(clone);
                            renderer._mfThickChildren.push(clone);
                        } catch (err) {
                            console.warn(`${TAG} Hitbox thickness clone failed:`, err);
                        }
                    });
                }
            }
        }

        function refreshHitboxDebugColor() {
            try {
                const renderer = getRenderer();
                const uniformColor = getHitboxUniformColor(renderer);
                if (!uniformColor || !renderer) return false;

                const enabled = localStorage.getItem('miniblox_hitboxdebugcolor_enabled') === 'true';
                const color = enabled
                    ? (localStorage.getItem('miniblox_hitboxdebugcolor') || DEFAULT_COLOR)
                    : DEFAULT_COLOR;

                uniformColor.set(color);

                return true;
            } catch (err) {
                console.warn(`${TAG} Hitbox/Debug Color refresh error:`, err);
                return false;
            }
        }

        function refreshHitboxThickness() {
            try {
                const renderer = getRenderer();
                if (!renderer) return;

                const enabled = localStorage.getItem('miniblox_hitboxdebugcolor_enabled') === 'true';
                const thickness = enabled ? readThickness('miniblox_hitboxdebugcolor_thickness') : 1;
                applyHitboxThickness(renderer, String(thickness));
            } catch (err) {
                console.warn(`${TAG} Hitbox thickness refresh error:`, err);
            }
        }

        // Color only needs to change on user input, so polling once a
        // second is plenty (the uniform object reference is stable).
        setInterval(refreshHitboxDebugColor, 1000);

        // Thickness clones can get invalidated as often as every render
        // frame, so re-check attachment every frame via requestAnimationFrame.
        (function thicknessLoop() {
            refreshHitboxThickness();
            requestAnimationFrame(thicknessLoop);
        })();

        window.MBLX_TP = window.MBLX_TP || {};
        window.MBLX_TP.refreshHitboxDebugColor = refreshHitboxDebugColor;
        window.MBLX_TP.refreshHitboxThickness = refreshHitboxThickness;

        console.log(`${TAG} Hitbox/Debug Color loaded.`);
    })();
})();
