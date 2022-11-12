<script>
  import {calculateIntersection, getUniquePairs} from '../assets/generalTools.js'

  export default {
    props: ['annotations', 'relationsHistory'],
    emits: ['next', 'back', 'annotationsChange', 'relationsHistoryChange'],
    data() {
      return {
        maxDistance: null,
        minDistance: null,
        angle: null,
        error: null,
        current1: null,
        current2: null,
        nextRelations: [],
        history: this.relationsHistory.slice(0),
      }
    },
    beforeMount() {
      if (this.history.length == 0) {
        let sortedAnnotations = this.annotations.filter(a => a.geometryType === 'linestring');

        // Orders the annotations alphanumerically. This is necessary to ensure that the relation
        // information is attached to the annotation whose name comes first when sorted.
        sortedAnnotations.sort((a, b) => {
          if (a.name < b.name)
            return -1;
          else if (a.name > b.name)
            return 1;
          else
            return 0;
        });

        // Generates a sequential list of relations from all of the annotations in the network. 
        const uniquePairs = getUniquePairs(sortedAnnotations);
        let intersections = [];

        for (let i = 0; i < uniquePairs.length; i++) {
          const intersection = calculateIntersection(uniquePairs[i].first.points, uniquePairs[i].second.points);
          if (intersection && intersection.intersects) {
            intersections.push([uniquePairs[i].first, uniquePairs[i].second])
          }

          this.nextRelations.push([uniquePairs[i].first, uniquePairs[i].second]);
        }

        const nodes = this.annotations.filter(a => a.geometryType === 'node');
        let disjointLines = this.annotations.filter(a => a.geometryType === 'linestring');

        for (let i = 0; i < intersections.length; i++) {
          let line1 = intersections[i][0];
          let line2 = intersections[i][1];
          disjointLines = disjointLines.filter(line => line.name != line1.name && line.name != line2.name);
        }

        for (let i = 0; i < nodes.length; i++) {
          for (let k = 0; k < disjointLines.length; k++) {
            this.nextRelations.push([nodes[i], disjointLines[k]]);
          }
        }
        
        for (let i = 0; i < nodes.length; i++) {
          for (let k = 0; k < intersections.length; k++) {
            this.nextRelations.push([
              nodes[i],
              [intersections[k][0], intersections[k][1]]
            ]);
          }
        }

        this.handleNext();
      } else {
        this.handleBack();
      }
    },
    methods: {
      handleNext(event) {
        if (this.current1 && this.current2) {
          this.history.push([this.current1, this.current2]);

          let annName, saveName;
          if (this.current2 instanceof Array) {
            annName = this.current1.name;
            saveName = this.current2[0].name + '&' + this.current2[1].name;
          } else {
            annName = this.current2.name;
            saveName = this.current1.name;
          }

          // Commit these properties to the global state. 
          const maxD = Number.isInteger(parseInt(this.maxDistance)) ? parseInt(this.maxDistance) : null;
          const minD = Number.isInteger(parseInt(this.minDistance)) ? parseInt(this.minDistance) : null;
          const angle = Number.isInteger(parseInt(this.angle)) ? parseInt(this.angle) : null;
          const error = Number.isInteger(parseInt(this.error)) ? parseInt(this.error) : null;
          const rel = {maxDistance: maxD, minDistance: minD, angle: angle, error: error};
          let index = this.annotations.findIndex((a) => a.name == annName);

          let anns = JSON.parse(JSON.stringify(this.annotations));
          this.anns[index].relations[saveName] = rel;

          this.$emit('annotationsChange', anns);
        }

        if (this.nextRelations.length == 0) {
          this.showAll();
          this.$emit('relationsHistoryChange', this.history);
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
        }
        
        if (this.history.length == 0) {
          this.showAll();
          this.$emit('relationsHistoryChange', []);
          this.$emit('back');
          return;
        }

        let current = this.history.pop();
        this.current1 = current[0];
        this.current2 = current[1];

        this.fillInForm();
        this.hideAllExcept(this.current1, this.current2);
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
        console.log(match)
        this.maxDistance = match ? match.maxDistance : '';
        this.minDistance = match ? match.minDistance : '';
        this.angle = match ? match.angle : '';
        this.error = match ? match.error : '';
      },

      hideAllExcept(first, second) {
        let anns = JSON.parse(JSON.stringify(this.annotations));

        for (let i = 0; i < anns.length; i++) {
          anns[i].state = 'transparent';

          if (second instanceof Array) {
            if (anns[i].name === first.name || anns[i].name === second[0].name) {
              anns[i].state = 'default';
            } else if (anns[i].name === second[1].name) {
              anns[i].state = 'transparent-but-related';
            }
          } else if (anns[i].name === first.name || anns[i].name === second.name) {
            anns[i].state = 'default';
          }
        }
        this.$emit('annotationsChange', anns);
      },

      showAll() {
        let anns = JSON.parse(JSON.stringify(this.annotations));
        for (let i = 0; i < this.annotations.length; i++) {
          anns[i].state = 'default';
        }
        this.$emit('annotationsChange', anns);
      },

      isAngular() {
        if (this.current2 instanceof Array)
          return true;

        return this.current1.geometryType === 'linestring' && this.current2.geometryType === 'linestring';
      },

      intersects() {
        if (this.current2 instanceof Array)
          return false;

        if (!this.isAngular())
          return false;

        const line1 = this.current1.points;
        const line2 = this.current2.points;
        const intersection = calculateIntersection(line1, line2);
        return intersection && intersection.intersects;
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
  <p>Relationship between {{current1.name}} and {{getReadableName(current2)}}</p>
  <div>
    <button @click="handleBack">Back</button>
    <input :disabled="intersects()" v-model="maxDistance" placeholder="Max distance (m)"/>
    <input :disabled="intersects()" v-model="minDistance" placeholder="Min distance (m)"/>
    <input :disabled="!isAngular()" v-model="angle" placeholder="Angle"/>
    <input :disabled="!isAngular()" v-model="error" placeholder="Error"/>
    <button @click="handleNext">Next</button>
  </div>
</template>

<style scoped>
  p {
    font-weight: bold;
    font-size: 20px;
    text-align: center;
    margin-bottom: 0.4em;
  }

  input {
    width: 10em;
  }

  div {
    display: flex;
    gap: 20px;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }
</style>
