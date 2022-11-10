<script>
  import {calculateIntersection} from '../assets/generalTools.js'

  export default {
    props: ['annotations', 'relationsHistory'],
    emits: ['next', 'back', 'annotationsChange', 'relationsHistoryChange'],
    beforeMount() {
      if (this.relationsHistory.length == 0) {
        let primaryRemaining = this.annotations.filter(a => a.geometryType === 'linestring');

        // Orders the annotations alphanumerically. This is necessary to ensure that the relation
        // information is attached to the annotation whose name comes first when sorted.
        primaryRemaining.sort((a, b) => {
          if (a.name < b.name)
            return -1;
          else if (a.name > b.name)
            return 1;
          else
            return 0;
        });

        let secondaryRemaining = [];
        let prime = null;
        let second = null;
        let intersections = [];

        // Generates a sequential list of relations from all of the annotations in the network. 
        while(primaryRemaining.length > 1) {
          if (secondaryRemaining.length > 0) {
            second = secondaryRemaining.pop();
          } else {
            prime = primaryRemaining.pop();
            secondaryRemaining = primaryRemaining.slice(0);
            second = secondaryRemaining.pop();
          }

          const intersection = calculateIntersection(prime.points, second.points);
          if (intersection && intersection.intersects) {
            intersections.push([prime, second])
          }

          this.nextRelations.push([prime, second]);
        }

        const nodes = this.annotations.filter(a => a.geometryType === 'node');
        let disjointLines = this.annotations.filter(a => a.geometryType === 'linestring');

        for (let i = 0; i < intersections.length; i++) {
          let line1 = intersections[i][0];
          let line2 = intersections[i][1];
          disjointLines = disjointLines.filter(line => line.name != line1.name && line.name != line2.name);
        }

        for (let i = 0; i < nodes.length; i++) {
          for (let j = 0; j < disjointLines.length; j++) {
            this.nextRelations.push([nodes[i], disjointLines[i]]);
          }
        }
        
        for (let i = 0; i < nodes.length; i++) {
          for (let j = 0; j < intersections.length; j++) {
            this.nextRelations.push([nodes[i], intersections[i][0], intersections[i][1]]);
          }
        }

        this.handleNext();
      } else {
        this.handleBack();
      }
    },
    data() {
      return {
        maxDistance: null,
        minDistance: null,
        angle: null,
        error: null,
        current1: null,
        current2: null,
        current3: null,
        nextRelations: [],
      }
    },
    methods: {
      handleNext(event) {
        if (this.current1 && this.current2) {
          this.relationsHistory.push([this.current1, this.current2]);

          // Commit these properties to the global state. 
          let index = this.annotations.findIndex((el) => el.name == this.current2.name);
          const maxD = Number.isInteger(parseInt(this.maxDistance)) ? parseInt(this.maxDistance) : null;
          const minD = Number.isInteger(parseInt(this.minDistance)) ? parseInt(this.minDistance) : null;
          const angle = Number.isInteger(parseInt(this.angle)) ? parseInt(this.angle) : null;
          const error = Number.isInteger(parseInt(this.error)) ? parseInt(this.error) : null;
          const rel = {maxDistance: maxD, minDistance: minD, angle: angle, error: error};

          let ann = this.annotations;
          ann[index].relations[this.current1.name] = rel;

          this.$emit('annotationsChange', ann);
        }

        if (this.nextRelations.length == 0) {
          this.showAll();
          this.$emit('relationsHistoryChange', this.relationsHistory);
          this.$emit('next');
          return;
        }

        let current = this.nextRelations.pop();
        this.current1 = current[0];
        this.current2 = current[1];

        this.fillInForm();

        if (current.length == 3) {
          this.current3 = current[2];
          this.hideAllButNodeLine(this.current1, this.current2, this.current3)
        } else {
          this.current3 = null;
          this.hideAllButTwo(this.current1, this.current2);
        }
      },

      handleBack(event) {
        if (this.current1 && this.current2) {
          this.nextRelations.push([this.current1, this.current2]);
        }
        
        if (this.relationsHistory.length == 0) {
          this.showAll();
          this.$emit('relationsHistoryChange', []);
          this.$emit('back');
          return;
        }

        let current = this.relationsHistory.pop();
        this.current1 = current[0];
        this.current2 = current[1];

        this.fillInForm();

        if (current.length == 3) {
          this.current3 = current[2];
          this.hideAllButNodeLine(this.current1, this.current2, this.current3)
        } else {
          this.current3 = null;
          this.hideAllButTwo(this.current1, this.current2);
        }
      },

      fillInForm() {
        // Initializes the inputs to the defaults or, if data has already been stored
        // for this relation, fills that data in.
        const match = this.current2.relations[this.current1.name];
        this.maxDistance = match ? match.maxDistance : '';
        this.minDistance = match ? match.minDistance : '';
        this.angle = match ? match.angle : '';
        this.error = match ? match.error : '';
      },

      hideAllButTwo(hide1, hide2) {
        let anns = this.annotations.slice(0);
        for (let i = 0; i < this.annotations.length; i++) {
          let match = anns[i].name == hide1.name || anns[i].name == hide2.name;
          anns[i].transparent = match ? false : true;
        }
        this.$emit('annotationsChange', anns);
      },

      hideAllButNodeLine(hide1, hide2, hide3) {
        let anns = this.annotations.slice(0);
        for (let i = 0; i < this.annotations.length; i++) {
          let match = anns[i].name == hide1.name || anns[i].name == hide2.name;
          anns[i].transparent = match ? false : true;
        }
        this.$emit('annotationsChange', anns);
      },

      showAll() {
        let anns = this.annotations;
        for (let i = 0; i < this.annotations.length; i++) {
          anns[i].transparent = false;
        }
        this.$emit('annotationsChange', anns);
      },

      isAngular() {
        return this.current1.geometryType === 'linestring' && this.current2.geometryType === 'linestring';
      },

      intersects() {
        if (!this.isAngular())
          return;

        const line1 = this.current1.points;
        const line2 = this.current2.points;
        const intersection = calculateIntersection(line1, line2);
        return intersection && intersection.seg1 && intersection.seg2;
      },
    }
  }
</script>

<template>
  <p>Relationship between {{current1.name}} and {{current2.name}}</p>
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
