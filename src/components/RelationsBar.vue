<script>
  import {calculateIntersection, getUniquePairs} from '../assets/generalTools.js'

  export default {
    props: ['annotations', 'relationsHistory'],
    emits: ['next', 'back', 'annotationsChange', 'relationsHistoryChange'],
    data() {
      return {
        maxDistance: '',
        minDistance: '',
        angle: '',
        error: '',
        current1: null,
        current2: null,
        nextRelations: [],
        anns: JSON.parse(JSON.stringify(this.annotations)),
      }
    },
    beforeMount() {
      if (this.relationsHistory.length == 0) {
        const linestrings = this.anns.filter(a => a.geometryType === 'linestring');
        const uniquePairs = getUniquePairs(linestrings);
        let intersections = [];

        // Generates relations between each pair of lines that compose an intersection
        for (let i = 0; i < uniquePairs.length; i++) {
          const intersection = calculateIntersection(uniquePairs[i].first.points, uniquePairs[i].second.points);
          if (intersection && intersection.intersects) {
            intersections.push([uniquePairs[i].first, uniquePairs[i].second]);
          }

          this.nextRelations.push([uniquePairs[i].first, uniquePairs[i].second]);
        }

        const nodes = this.anns.filter(a => a.geometryType === 'node');
        const shapes = this.anns.filter(a => a.geometryType === 'shape');
        let disjointLines = this.anns.filter(a => a.geometryType === 'linestring');

        for (let i = 0; i < intersections.length; i++) {
          let line1 = intersections[i][0];
          let line2 = intersections[i][1];
          disjointLines = disjointLines.filter(line => line.name != line1.name && line.name != line2.name);
        }

        // Generates relations between nodes and lines that have no intersections
        for (let i = 0; i < nodes.length; i++) {
          for (let k = 0; k < disjointLines.length; k++) {
            this.nextRelations.push([nodes[i], disjointLines[k]]);
          }
        }

        // Generates relations between nodes and shapes
        for (let i = 0; i < nodes.length; i++) {
          for (let k = 0; k < shapes.length; k++) {
            this.nextRelations.push([nodes[i], shapes[k]]);
          }
        }

        // Generates relations between disjoint lines and shapes
        for (let i = 0; i < disjointLines.length; i++) {
          for (let k = 0; k < shapes.length; k++) {
            this.nextRelations.push([disjointLines[i], shapes[k]]);
          }
        }
        
        // Generates relations between nodes and intersections
        for (let i = 0; i < nodes.length; i++) {
          for (let k = 0; k < intersections.length; k++) {
            this.nextRelations.push([
              nodes[i],
              [intersections[k][0], intersections[k][1]]
            ]);
          }
        }

        // Generates relations between shapes and intersections
        for (let i = 0; i < shapes.length; i++) {
          for (let k = 0; k < intersections.length; k++) {
            this.nextRelations.push([
              shapes[i],
              [intersections[k][0], intersections[k][1]]
            ]);
          }
        }

        // Generates relations between each node
        const nodePairs = getUniquePairs(nodes);
        for (let i = 0; i < nodePairs.length; i++) {
          this.nextRelations.push([nodePairs[i].first, nodePairs[i].second]);
        }

        // Generates relations between each shape
        const shapePairs = getUniquePairs(shapes);
        for (let i = 0; i < shapePairs.length; i++) {
          this.nextRelations.push([shapePairs[i].first, shapePairs[i].second]);
        }

        this.handleNext();
      } else {
        this.handleBack();
      }
    },
    mounted() {
      window.addEventListener('keydown', this.keyDownListener);
    },
    computed: {
      // Enables the angle inputs if both annotations are of type linestring
      angleProps() {
        let props = {'disable': false, 'bg-color': 'secondary', 'label-color': 'white', 'input-style': 'color: white'};

        if (this.current2 instanceof Array)
          return props;

        if (this.current1.geometryType !== 'linestring' || this.current2.geometryType !== 'linestring') {
          props['disable'] = true;
          props['bg-color'] = 'none';
        }

        return props;
      },

      // Determines if the distance inputs are enabled based on if
      // the two lines intersect
      distanceProps() {
        let props = {'disable': false, 'bg-color': 'secondary', 'label-color': 'white', 'input-style': 'color: white'};

        if (this.current2 instanceof Array)
          return props;

        if (this.current1.geometryType !== 'linestring' || this.current2.geometryType !== 'linestring')
          return props;

        const line1 = this.current1.points;
        const line2 = this.current2.points;
        const intersection = calculateIntersection(line1, line2);

        if (intersection && intersection.intersects) {
          props['disable'] = true;
          props['bg-color'] = 'none';
        }

        return props;
      },
    },
    methods: {
      keyDownListener(event) {
        if (event.key === 'ArrowRight') {
          this.handleNext();
        } else if (event.key === 'ArrowLeft') {
          this.handleBack();
        }
      },

      handleNext(event) {
        if (this.current1 && this.current2) {
          this.saveRelationships();
          this.relationsHistory.push([this.current1, this.current2]);
        }

        if (this.nextRelations.length == 0) {
          document.removeEventListener('keydown', this.keyDownListener);
          this.$emit('annotationsChange', this.anns);
          this.$emit('relationsHistoryChange', this.relationsHistory);
          this.$emit('next');
          return;
        }

        let current = this.nextRelations.pop();
        this.current1 = current[0];
        this.current2 = current[1];

        this.fillInForm();
        this.hideAllExcept(this.current1, this.current2);
      },

      handleBack(event) {
        if (this.current1 && this.current2) {
          this.nextRelations.push([this.current1, this.current2]);
          this.saveRelationships();
        }
        
        if (this.relationsHistory.length == 0) {
          document.removeEventListener('keydown', this.keyDownListener);
          this.showAll();
          this.$emit('relationsHistoryChange', []);
          this.$emit('back');
          return;
        }

        let current = this.relationsHistory.pop();
        this.current1 = current[0];
        this.current2 = current[1];

        this.fillInForm();
        this.hideAllExcept(this.current1, this.current2);
      },

      // Commit the relationships to the global state. 
      saveRelationships() {
        let annName, saveName;
        if (this.current2 instanceof Array) {
          annName = this.current1.name;
          saveName = this.current2[0].name + '&' + this.current2[1].name;
        } else {
          annName = this.current2.name;
          saveName = this.current1.name;
        }

        const maxD = Number.isInteger(parseInt(this.maxDistance)) ? parseInt(this.maxDistance) : null;
        const minD = Number.isInteger(parseInt(this.minDistance)) ? parseInt(this.minDistance) : null;
        const angle = Number.isInteger(parseInt(this.angle)) ? parseInt(this.angle) : null;
        const error = Number.isInteger(parseInt(this.error)) ? parseInt(this.error) : null;
        const rel = {maxDistance: maxD, minDistance: minD, angle: angle, error: error};
        let index = this.anns.findIndex((a) => a.name == annName);

        this.anns[index].relations[saveName] = rel;

        if (this.current2 instanceof Array) {
          this.current1.relations[saveName] = rel;
        } else {
          this.current2.relations[saveName] = rel;
        }
      },

      fillInForm() {
        // Initializes the inputs to the defaults or, if data has already been stored
        // for this relation, fills that data in.
        let match;
        if (this.current2 instanceof Array) {
          match = this.current1.relations[this.current2[0].name + '&' + this.current2[1].name];
        } else {
          match = this.current2.relations[this.current1.name];
        }
        this.maxDistance = match ? match.maxDistance : '';
        this.minDistance = match ? match.minDistance : '';
        this.angle = match ? match.angle : '';
        this.error = match ? match.error : '';
      },

      hideAllExcept(first, second) {
        for (let i = 0; i < this.anns.length; i++) {
          this.anns[i].state = 'transparent';

          if (second instanceof Array) {
            if (this.anns[i].name === first.name || this.anns[i].name === second[0].name) {
              this.anns[i].state = 'default';
            } else if (this.anns[i].name === second[1].name) {
              this.anns[i].state = 'transparent-but-related';
            }
          } else if (this.anns[i].name === first.name || this.anns[i].name === second.name) {
            this.anns[i].state = 'default';
          }
        }
        this.$emit('annotationsChange', this.anns);
      },

      showAll() {
        for (let i = 0; i < this.anns.length; i++) {
          this.anns[i].state = 'default';
        }
        this.$emit('annotationsChange', this.anns);
      },

      getReadableName(ann) {
        if (ann instanceof Array) {
          return ann[0].name + '-' + ann[1].name + ' intersection';
        } else {
          return ann.name;
        }
      },
    }
  }
</script>

<template>
  <p v-if="anns.length > 1" class="input-title">Relationship between {{current1.name}} and {{getReadableName(current2)}}</p>
  <div v-if="anns.length > 1" class="input-bar-flex">
    <q-btn @click="handleBack" label="Back" color="primary"/>
    <q-input class="property-input" outlined label="Min distance" stack-label
      v-bind="distanceProps"
      type="number"
      v-model.number="minDistance" 
    >
      <q-tooltip class="bg-secondary text-body2" anchor="top middle" self="bottom middle" :offset="[10, 10]" :delay="600">
        Minimum distance between the objects in metres (optional)
      </q-tooltip>
    </q-input>
    <q-input class="property-input" outlined label="Max distance" stack-label
      v-bind="distanceProps"
      type="number"
      v-model.number="maxDistance" 
    >
      <q-tooltip class="bg-secondary text-body2" anchor="top middle" self="bottom middle" :offset="[10, 10]" :delay="600">
        Maximum distance between the objects in metres (strongly recommended)
      </q-tooltip>
    </q-input>
    <q-input class="property-input" outlined label="Angle" stack-label
      v-bind="angleProps"
      type="number"
      v-model.number="angle" 
    >
      <q-tooltip class="bg-secondary text-body2" anchor="top middle" self="bottom middle" :offset="[10, 10]" :delay="600">
        Angle between the objects (optional)
      </q-tooltip>
    </q-input>
    <q-input class="property-input" outlined label="Angle Error" stack-label
      v-bind="angleProps"
      type="number"
      v-model.number="error" 
    >
      <q-tooltip class="bg-secondary text-body2" anchor="top middle" self="bottom middle" :offset="[10, 10]" :delay="600">
        Estimated error of the angle between the objects (optional)
      </q-tooltip>
    </q-input>
    <q-btn @click="handleNext" label="Next" color="primary"/>
  </div>
</template>

<style scoped>
  .property-input {
    max-width: 150px;
  }
</style>
