<script>
  import {clipPolygons} from '../assets/generalTools.js'
  export default {
    props: ['drawingState', 'annotations'],
    emits: ['next', 'back', 'drawingStateChange', 'annotationsChange', 'warn'],
    data() {
      return {
        history: [],
        drawingShape: false,
        mode: 'add',
      }
    },
    mounted() {
      document.addEventListener('keydown', this.keyDownListener);
      document.addEventListener('keyup', this.keyUpListener);
    },
    methods: {
      keyDownListener(event) {
        event.stopPropagation();
        let key = event.key.toLowerCase();
        if (key === 'l') {
          if (this.drawingShape) this.toggleShapeMenu();
          this.toggleDrawingButton('linestring');
        } else if (key === 'n') {
          if (this.drawingShape) this.toggleShapeMenu();
          this.toggleDrawingButton('node');
        } else if (key === 'r') {
          if (!this.drawingShape) this.toggleShapeMenu();
          this.toggleShapeDrawingButton('rectangle');
        } else if (key === 'c') {
          if (!this.drawingShape) this.toggleShapeMenu();
          this.toggleShapeDrawingButton('circle');
        } else if (key === 'p') {
          if (!this.drawingShape) this.toggleShapeMenu();
          this.toggleShapeDrawingButton('polygon');
        } else if (key === 's') {
          if (!this.drawingShape) this.toggleShapeMenu();
        } else if (key === 'd') {
          if (this.drawingShape) this.toggleShapeMenu();
        } else if (event.key === 'Shift') {
          this.mode = 'sub';
          this.toggleModeButton(this.mode);
        } else if (event.key === 'ArrowRight') {
          this.handleNext();
        } else if (event.key === 'ArrowLeft') {
          this.handleBack();
        }
      },
      keyUpListener(event) {
        if (event.key === 'Shift') {
          this.mode = 'add';
          this.toggleModeButton(this.mode);
        }
      },
      getProps(type) {
        let primaryIconMap = {
          'linestring': 'north_east',
          'node': 'radio_button_checked',
          'rectangle': 'rectangle',
          'circle': 'circle',
          'polygon': 'polyline',
        }

        let icon = primaryIconMap[type];
        let color = 'primary';

        if (this.drawingState.endsWith(type)) {
          icon = 'cancel';
          color = 'negative';
        }

        return {'icon': icon, 'color': color};
      },
      handleNext(event) {
        if (this.annotations.length > 0) {
          document.removeEventListener('keydown', this.keyDownListener);
          document.removeEventListener('keyup', this.keyUpListener);
          if (this.drawingShape) this.toggleShapeMenu();
          this.$emit('drawingStateChange', 'none');
          this.$emit('next');
        } else {
          this.$emit('warn', 'Place at least one object.');
        }
      },
      handleBack(event) {
        document.removeEventListener('keydown', this.keyDownListener);
        document.removeEventListener('keyup', this.keyUpListener);
        this.$emit('back');
      },
      toggleShapeDrawingButton(buttonName) {
        let state = this.drawingState;
        state = (!state.endsWith(buttonName) ? (this.mode + '_' + buttonName) : 'none');
        this.$emit('drawingStateChange', state);
      },
      toggleDrawingButton(buttonName) {
        let state = this.drawingState;
        state = (state !== buttonName ? buttonName : 'none');
        this.$emit('drawingStateChange', state);
      },
      toggleShapeMenu(event) {
        let ann = this.annotations[this.annotations.length - 1];
        if (ann && ann.geometryType === 'shape' && !ann.completed) {
          let anns = this.annotations;
          anns[this.annotations.length - 1].completed = true;
          this.$emit('annotationsChange', anns);
        }

        this.drawingShape = !this.drawingShape;
        this.$emit('drawingStateChange', 'none');
      },
      toggleModeButton(value, event) {
        if (this.drawingState !== 'none') {
          let state = this.drawingState;
          if (state.includes('_')) {
            state = value + state.substring(3);
          } else {
            state = value + '_' + state;
          }

          this.$emit('drawingStateChange', state);
        }
      },
      handleUndo(event) {
        let anns = this.annotations;
        let ann = this.annotations.pop();
        this.history.push(Object.assign({}, ann));

        if (ann.geometryType === 'shape') {
          if (ann.history.length > 1) {
            ann.history.pop();
            ann.points = ann.history[ann.history.length - 1];
            anns.push(ann);
          }
        }

        this.$emit('annotationsChange', anns);
      },
      handleRedo(event) {
        let anns = this.annotations;
        let ann = this.history.pop();

        if (ann.geometryType === 'shape') {
          if(anns.length > 0 && ann.name === anns[anns.length - 1].name) {
            let results = clipPolygons(anns[anns.length - 1].points, ann.points, 'add');
            anns[anns.length - 1].history.push(results.points);
            anns[anns.length - 1].points = results.points;
          } else {
            anns.push(ann);
          }
        } else {
          anns.push(ann);
        }

        this.$emit('annotationsChange', anns);
      },
    }
  }
</script>

<template>
  <Transition mode="out-in">
    <div v-if="!drawingShape" class="input-bar-flex">
      <q-btn v-if="!drawingShape" class="q-py-md" @click="toggleDrawingButton('linestring')" label="Linestring" v-bind="getProps('linestring')">
        <q-tooltip class="bg-secondary text-body2" anchor="top middle" self="bottom middle" :offset="[10, 10]" :delay="600">
          Click and drag to draw a line.
        </q-tooltip>
      </q-btn>
      <q-btn class="q-py-md" @click="toggleDrawingButton('node')" label="Node" v-bind="getProps('node')">
        <q-tooltip class="bg-secondary text-body2" anchor="top middle" self="bottom middle" :offset="[10, 10]" :delay="600">
          Click once on the canvas to place a node.
        </q-tooltip>
      </q-btn>
      <q-btn class="q-py-md" @click="toggleShapeMenu" label="Shape" icon="pentagon" color="primary">
        <q-tooltip class="bg-secondary text-body2" anchor="top middle" self="bottom middle" :offset="[10, 10]" :delay="600">
          Draw the outline of a uniquely shaped map item.
        </q-tooltip>
      </q-btn>
    </div>

    <div v-else class="input-bar-flex">
      <q-toggle v-model="mode" true-value="add" false-value="sub" @update:model-value="toggleModeButton" 
        size="l" checked-icon="add" unchecked-icon="remove" color="secondary" keep-color>
        <q-tooltip class="bg-secondary text-body2" anchor="top middle" self="bottom middle" :offset="[10, 10]" :delay="600">
          Toggle between subtractive or additive mode.
        </q-tooltip>
      </q-toggle>
      <q-btn class="q-py-md" @click="toggleShapeDrawingButton('rectangle')" label="Rectangle" v-bind="getProps('rectangle')">
        <q-tooltip class="bg-secondary text-body2" anchor="top middle" self="bottom middle" :offset="[10, 10]" :delay="600">
          Click and drag to draw a rectangle.
        </q-tooltip>
      </q-btn>
      <q-btn class="q-py-md" @click="toggleShapeDrawingButton('circle')" label="Circle" v-bind="getProps('circle')">
        <q-tooltip class="bg-secondary text-body2" anchor="top middle" self="bottom middle" :offset="[10, 10]" :delay="600">
          Click and drag to draw a circle.
        </q-tooltip>
      </q-btn>
      <q-btn class="q-py-md" @click="toggleShapeDrawingButton('polygon')" label="Polygon" v-bind="getProps('polygon')">
        <q-tooltip class="bg-secondary text-body2" anchor="top middle" self="bottom middle" :offset="[10, 10]" :delay="600">
          Click to drop points around the outline of the polygonal shape.
        </q-tooltip>
      </q-btn>
      <q-btn class="q-py-md" @click="toggleShapeMenu" label="Done" icon="done" color="secondary">
        <q-tooltip class="bg-secondary text-body2" anchor="top middle" self="bottom middle" :offset="[10, 10]" :delay="600">
          Click to complete the shape.
        </q-tooltip>
      </q-btn>
    </div>
  </Transition>

  <div class="input-bar-flex">
    <q-btn @click="handleBack" label="Back" color="primary"/>
    <q-btn @click="handleUndo" :disabled="!annotations.length" icon="undo" label="Undo" color="secondary"/>
    <q-btn @click="handleRedo" :disabled="!history.length" icon-right="redo" label="Redo" color="secondary"/>
    <q-btn @click="handleNext" label="Next" color="primary"/>
  </div>
</template>

<style scoped>
  .input-bar-flex {
    gap: 10px;
  }

  .v-enter-active {
    transition: all .15s cubic-bezier(0.55, 0.085, 0.68, 0.53);
  }

  .v-leave-active {
    transition: all .2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  .v-enter, .v-leave-to {
    transform: scaleY(0) translateZ(0);
    opacity: 0;
  }
</style>