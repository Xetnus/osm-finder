#include <lua.h>
#include <lauxlib.h>
#include <lualib.h> 
#include <math.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>

#define max(a,b) \
   ({ __typeof__ (a) _a = (a); \
       __typeof__ (b) _b = (b); \
     _a > _b ? _a : _b; })

#define min(a,b) \
   ({ __typeof__ (a) _a = (a); \
       __typeof__ (b) _b = (b); \
     _a < _b ? _a : _b; })

const int MAX_X = 29;
const int MAX_Y = 29;
const int LINE_WIDTH = 50;
const char* DATA_FILE_NAME = "shapeComparisonData.txt";

int totalNodeCount = 0;

/*
******************************************************************************
 * Merge Sort Implementation 
******************************************************************************
*/

void merge(char** arr, int left, int mid, int right) {
    int i, j, k;
    int n1 = mid - left + 1;
    int n2 = right - mid;

    char** leftArr = (char**)malloc(n1 * sizeof(char*));
    char** rightArr = (char**)malloc(n2 * sizeof(char*));

    for (i = 0; i < n1; i++)
        leftArr[i] = arr[left + i];
    for (j = 0; j < n2; j++)
        rightArr[j] = arr[mid + 1 + j];

    i = 0;
    j = 0;
    k = left;

    char *leftCopy = calloc(LINE_WIDTH, sizeof(char));
    char *rightCopy = calloc(LINE_WIDTH, sizeof(char));

    while (i < n1 && j < n2) {
        snprintf(leftCopy, LINE_WIDTH, "%s", leftArr[i]);
        long int leftId = strtol(strtok(leftCopy, " "), NULL, 10);
        snprintf(rightCopy, LINE_WIDTH, "%s", rightArr[j]);
        long int rightId = strtol(strtok(rightCopy, " "), NULL, 10);

        if (leftId <= rightId) {
            arr[k] = leftArr[i];
            i++;
        } else {
            arr[k] = rightArr[j];
            j++;
        }
        k++;
    }

    free(leftCopy);
    free(rightCopy);

    while (i < n1) {
        arr[k] = leftArr[i];
        i++;
        k++;
    }
    while (j < n2) {
        arr[k] = rightArr[j];
        j++;
        k++;
    }

    free(leftArr);
    free(rightArr);
}

void mergeSort(char** arr, int left, int right) {
    if (left < right) {
        int mid = left + (right - left) / 2;

        mergeSort(arr, left, mid);
        mergeSort(arr, mid + 1, right);

        merge(arr, left, mid, right);
    }
}

// Reads a line at the given index from the given file and stores it in *line.
static int readLine(char *line, int index, FILE *dataFile) {
    int status = fseek(dataFile, index * (LINE_WIDTH - 1), SEEK_SET);
    if (status != 0) {
        printf("Error seeking data file.\n");
        return -1;
    }
    status = fread(line, LINE_WIDTH - 1, 1, dataFile);
    if (status < 1) {
        printf("Error reading data file.\n");
        return -1;
    }

    return 0;
}

/*
******************************************************************************
 * Binary Search Implementation 
******************************************************************************
*/

int binarySearchFile(FILE *dataFile, int l, int r, long int x)
{
    char line[LINE_WIDTH];

    while (l <= r) {
        int m = l + (r - l) / 2;
 
        int status = readLine(line, m, dataFile);
        if (status != 0) {
            printf("Could not locate %ld due to bad read.\n", x);
            return -1;
        }

        long int id = strtol(strtok(line, " "), NULL, 10);

        if (id == x) {
            return m;
        } else if (id < x) {
            l = m + 1;
        } else {
            r = m - 1;
        }
    }

    // If we reach here, then element was not present
    return -1;
}

/**
 * Stores a batch of nodes in the data file, in ascending order by the node ID.
 * Params:
 *  1. number of nodes being passed
 *  2. table of nodes
*/
static int l_storeNodesBatch(lua_State *L) {
    if (!lua_isnumber(L, 1) || !lua_istable(L, 2)) {
        printf("Incorrect arguments provided.\n");
        return 0;
    }

    int nodeCount = lua_tointeger(L, 1);
    char *nodes[nodeCount];
    int i = 0;

    lua_pushnil(L);

    // Read node table into nodes array
    while (lua_next(L, -2)) {
        lua_pushvalue(L, -2);
        const char *key = lua_tostring(L, -1);
        lua_getfield(L, -2, "x");
        lua_getfield(L, -3, "y");
        const char *x = lua_tostring(L, -2);
        const char *y = lua_tostring(L, -1);
        lua_pop(L, 4);

        size_t realLength = strlen(key) + strlen(x) + strlen(y) + 4;
        int paddingLength = LINE_WIDTH - (int) realLength;
        char *buf = calloc(LINE_WIDTH, sizeof(char));
        // Format: "<key> <x> <y>[paddingLength number of spaces]"
        int s = snprintf(buf, LINE_WIDTH, "%s %s %s%*s\n", key, x, y, -paddingLength, "");
        if (s > LINE_WIDTH || s < 0) {
            free(buf);
            printf("Improper buffer assignment.\n");
            return 0;
        }
        nodes[i] = buf;
        i++;
    }

    // Sorts the new batch of nodes by ID
    mergeSort(nodes, 0, nodeCount - 1);

    // Ensures that the data file exists
    if (totalNodeCount == 0) {
        FILE *dataFile = fopen(DATA_FILE_NAME, "w");
        if (dataFile != NULL) {
            fclose(dataFile);
        }
    }

    // Temporary file for pseudo "in-place" sorting.
    // We loop through the lines in the permanent data file, copying each line
    // into the temporary file, and inserting any of the new nodes into their
    // appropriate sorted locations. Then renames the temp file to be the perm file.
    char tempDataFileName[strlen(DATA_FILE_NAME) + 2];
    snprintf(tempDataFileName, sizeof(tempDataFileName), ".%s", DATA_FILE_NAME);

    FILE *dataFile = fopen(DATA_FILE_NAME, "r");
    FILE *tempDataFile = fopen(tempDataFileName, "w");
    if (dataFile == NULL || tempDataFile == NULL) {
        printf("Error opening data or temp file.\n");
        return 0;
    }

    int position = 0;
    char *lineCopy = calloc(LINE_WIDTH, sizeof(char));
    char *nodeCopy = calloc(LINE_WIDTH, sizeof(char));

    for (int i = 0; i < nodeCount; i++) {
        snprintf(nodeCopy, LINE_WIDTH, "%s", nodes[i]);
        long int newId = strtol(strtok(nodes[i], " "), NULL, 10);

        // Goes line by line through the data file, copying each line into the temp file.
        // Inserts nodes from the nodes array as appropriate to ensure correct ordering.
        int flag = 0;
        while (!flag && position < totalNodeCount) {
            char line[LINE_WIDTH];
            int status = readLine(line, position, dataFile);
            if (status != 0) {
                printf("Skipping line at position %d due to bad read.\n", position);
                position++;
                continue;
            }

            snprintf(lineCopy, LINE_WIDTH, "%s", line);
            long int lineId = strtol(strtok(line, " "), NULL, 10);

            if (lineId > newId) {
                flag = 1;
            } else {
                fputs(lineCopy, tempDataFile);
                position++;
            }
        }
        fputs(nodeCopy, tempDataFile);
    }

    free(lineCopy);
    free(nodeCopy);

    for (int i = 0; i < nodeCount; i++) {
        free(nodes[i]);
    }

    // Even though all of the nodes in the nodes array have been added to the temp file, there 
    // may still be lines from the permanent data file that haven't yet been copied.
    // Loop until all lines are copied.
    for (; position < totalNodeCount; position++) {
        char line[LINE_WIDTH];
        int status = readLine(line, position, dataFile);
        if (status != 0) {
            printf("Skipping final line at position %d due to bad read.\n", position);
        } else {
            fputs(line, tempDataFile);
        }
    }

    totalNodeCount += nodeCount;

    fclose(dataFile);
    fclose(tempDataFile);

    remove(DATA_FILE_NAME);
    int status = rename(tempDataFileName, DATA_FILE_NAME);
    if (status != 0) {
        printf("Error renaming data file.\n");
        return 0;
    }

    return 0;
}

/*
******************************************************************************
 * Hu Moment Implementation 
******************************************************************************
*/

static double dist2(double v[], double w[]) {
    return pow(v[0] - w[0], 2) + pow(v[1] - w[1], 2);
}

static double distToSegmentSquared(double p[], double v[], double w[]) {
    double l2 = dist2(v, w);
    if (l2 == 0) {
        return dist2(p, v);
    }

    double t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
    t = max(0, min(1, t));

    double new_w[] = { (v[0] + t * (w[0] - v[0])), (v[1] + t * (w[1] - v[1])) };
    return dist2(p, new_w);
}

// Calculates shortest distance between point and a line segment
// p: point whose distance to line segment will be measured
// v: point at one end of line segment
// w: point at other end of line segment
// Translated into C from this answer:
// https://stackoverflow.com/a/1501725/1941353
static double distToSegment(double p[], double v[], double w[]) {
    return sqrt(distToSegmentSquared(p, v, w));
}

// Determines binary value at given coordinates
static int calculateI(int numNodes, double nodes[][2], int x, int y) {
    double p[] = {(double) x, (double) y};

    for (int i = 0; i < numNodes - 1; i++) {
        double segmentP1[] = {nodes[i][0], nodes[i][1]};
        double segmentP2[] = {nodes[i + 1][0], nodes[i + 1][1]};

        if (distToSegment(p, segmentP1, segmentP2) <= 0.5) {
            return 1;
        }
    }

    return 0;
}

static int calculateM(int numNodes, double nodes[][2], int p, int q) {
    int m = 0;

    for (int x = 0; x <= MAX_X; x++) {
        for (int y = 0; y <= MAX_Y; y++) {
            m += (pow(x, p) * pow(y, q) * calculateI(numNodes, nodes, x, y));
        }
    }

    return m;
}

// Greek letter mu
static double calculateMu(int numNodes, double nodes[][2], double centroidX, double centroidY, int p, int q) {
    double mu = 0;

    for (int x = 0; x <= MAX_X; x++) {
        for (int y = 0; y <= MAX_Y; y++) {
            mu += (pow((x - centroidX), p) * pow((y - centroidY), q) * calculateI(numNodes, nodes, x, y));
        }
    }

    return mu;
}

// Greek letter eta
static double calculateEta(int numNodes, double nodes[][2], double centroidX, double centroidY, double muDenominator, int p, int q) {
    double denominator = pow(muDenominator, (double) (1.0 + (p + q) / 2.0));
    double numerator = calculateMu(numNodes, nodes, centroidX, centroidY, p, q);
    return (numerator / denominator);
}


// Function to calculate Hu Moments based on explanation found here:
// https://en.wikipedia.org/wiki/Image_moment
// Liberties were taken to optimize the algorithm for C
static int l_calculateHuMoments(lua_State *L) {
    if (!lua_isnumber(L, 1) || !lua_istable(L, 2)) {
        printf("Incorrect arguments provided.\n");
        return 0;
    }

    int count = lua_tonumber(L, 1);
    lua_pushnil(L);

    long int node_ids[count];
    int i = 0;
    while (lua_next(L, -2)) {
        node_ids[i] = (long int) lua_tonumber(L, -1);
        i++;
        lua_pop(L, 1);
    }
    lua_pop(L, 1);

    FILE *dataFile;
    char line[LINE_WIDTH];
    size_t len = 0;
    ssize_t read;

    dataFile = fopen(DATA_FILE_NAME, "r");
    if (dataFile == NULL) {
        printf("Error opening data file while calculating Hu Moments.\n");
        return 0;
    }

    double nodes[count][2];
    for (int i = 0; i < count; i++) {
        int index = binarySearchFile(dataFile, 0, totalNodeCount - 1, node_ids[i]);

        if (index > 0) {
            char line[LINE_WIDTH];
            int status = readLine(line, index, dataFile);
            if (status != 0) {
                printf("Skipping node %ld due to bad read.\n", node_ids[i]);
                continue;
            }
            strtok(line, " "); // Ignores the ID
            nodes[i][0] = strtof(strtok(NULL, " "), NULL);
            nodes[i][1] = strtof(strtok(NULL, " "), NULL);
        }
    }

    fclose(dataFile);

    double maxCoords[] = {nodes[0][0], nodes[0][1]};
    double minCoords[] = {nodes[0][0], nodes[0][1]};
    for(int i = 0; i < count; i++) {
        if (nodes[i][0] > maxCoords[0]) {
            maxCoords[0] = nodes[i][0];
        } else if (nodes[i][0] < minCoords[0]) {
            minCoords[0] = nodes[i][0];
        }

        if (nodes[i][1] > maxCoords[1]) {
            maxCoords[1] = nodes[i][1];
        } else if (nodes[i][1] < minCoords[1]) {
            minCoords[1] = nodes[i][1];
        }
    }

    double xRange = maxCoords[0] - minCoords[0];
    double yRange = maxCoords[1] - minCoords[1];

    double xRatio = MAX_X / xRange;
    double yRatio = MAX_Y / yRange;
    double scale = min(xRatio, yRatio);

    for(int i = 0; i < count; i++) {
        nodes[i][0] -= minCoords[0];
        nodes[i][1] -= minCoords[1];

        nodes[i][0] *= scale;
        nodes[i][1] *= scale;
    }

    double h1 = 0, h2 = 0, h3 = 0, h4 = 0, h5 = 0, h6 = 0, h7 = 0;
    const double mDenominator = calculateM(count, nodes, 0, 0);

    if (mDenominator != 0) { // mDenominator = 0 if and only if grid is completely empty
        const double centroidX = calculateM(count, nodes, 1, 0) / mDenominator;
        const double centroidY = calculateM(count, nodes, 0, 1) / mDenominator;

        const double muDenominator = mDenominator;

        double eta20 = calculateEta(count, nodes, centroidX, centroidY, muDenominator, 2, 0);
        double eta02 = calculateEta(count, nodes, centroidX, centroidY, muDenominator, 0, 2);
        double eta11 = calculateEta(count, nodes, centroidX, centroidY, muDenominator, 1, 1);
        double eta30 = calculateEta(count, nodes, centroidX, centroidY, muDenominator, 3, 0);
        double eta12 = calculateEta(count, nodes, centroidX, centroidY, muDenominator, 1, 2);
        double eta03 = calculateEta(count, nodes, centroidX, centroidY, muDenominator, 0, 3);
        double eta21 = calculateEta(count, nodes, centroidX, centroidY, muDenominator, 2, 1);

        h1 = eta20 + eta02;

        h2 =    pow(
                    (eta20 - eta02)
                    , 2
                ) + 
                4 * pow(
                    eta11
                    , 2
                );

        h3 =    pow(
                    (eta30 - 3 * eta12)
                    , 2
                ) + 
                pow(
                    (3 * eta21 - eta03)
                    , 2
                );

        h4 =    pow(
                    (eta30 + eta12)
                    , 2
                ) + 
                pow(
                    (eta21 + eta03)
                    , 2
                );

        h5 =    (eta30 - 3 * eta12) * 
                (eta30 + eta12) * 
                (
                    pow(
                        (eta30 + eta12)
                        , 2
                    ) - 
                    3 * pow(
                        (eta21 + eta03)
                        , 2
                    )
                ) +
                (3 * eta21 - eta03) * 
                (eta21 + eta03) * 
                (
                    3 * pow(
                        (eta30 + eta12)
                        , 2
                    ) - 
                    pow(
                        (eta21 + eta03)
                        , 2
                    )
                );

        h6 =    (eta20 - eta02) * 
                (
                    pow(
                        (eta30 + eta12)
                        , 2
                    ) - 
                    pow(
                        (eta21 + eta03)
                        , 2
                    )
                ) +
                4 * eta11 * 
                (eta30 + eta12) * 
                (eta21 + eta03);

        h7 =    (3 * eta21 - eta03) * 
                (eta30 + eta12) * 
                (
                    pow(
                        (eta30 + eta12)
                        , 2
                    ) - 
                    3 * pow(
                        (eta21 + eta03)
                        , 2
                    )
                ) -
                (eta30 - 3 * eta12) * 
                (eta21 + eta03) * 
                (
                    3 * pow(
                        (eta30 + eta12)
                        , 2
                    ) - 
                    pow(
                        (eta21 + eta03)
                        , 2
                    )
                );
    }

    lua_pushnumber(L, h1);
    lua_pushnumber(L, h2);
    lua_pushnumber(L, h3);
    lua_pushnumber(L, h4);
    lua_pushnumber(L, h5);
    lua_pushnumber(L, h6);
    lua_pushnumber(L, h7);
    return 7;  /* number of results */
}

int luaopen_shapeComparison(lua_State *L) {
    lua_register(
			L,                           /* Lua state variable */
			"calculateHuMoments",        /* func name as known in Lua */
			l_calculateHuMoments         /* func name in this file */
			);
    lua_register(
			L,
			"storeNodesBatch",
            l_storeNodesBatch 
			);
    return 0;
}