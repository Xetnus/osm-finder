#include <lua.h>
#include <lauxlib.h>
#include <lualib.h> 
#include <math.h>
#include <string.h>
#include <stdlib.h>

#define max(a,b) \
   ({ __typeof__ (a) _a = (a); \
       __typeof__ (b) _b = (b); \
     _a > _b ? _a : _b; })

#define min(a,b) \
   ({ __typeof__ (a) _a = (a); \
       __typeof__ (b) _b = (b); \
     _a < _b ? _a : _b; })

int maxX = 30;
int maxY = 30;

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
static int calculateI(int numNodes, double nodes[][2], double x, double y) {
    double p[] = {x, y};

    for (int i = 0; i < numNodes - 1; i++) {
        double segmentP1[] = {nodes[i][0], nodes[i][1]};
        double segmentP2[] = {nodes[i + 1][0], nodes[i + 1][1]};

        if (distToSegment(p, segmentP1, segmentP2) < 1) {
            return 1;
        }
    }

    return 0;
}

static int calculateM(int numNodes, double nodes[][2], int p, int q) {
    int m = 0;

    for (double x = 0; x < maxX; x++) {
        for (double y = 0; y < maxY; y++) {
            m += (pow(x, p) * pow(y, q) * calculateI(numNodes, nodes, x, y));
        }
    }

    return m;
}

// Greek letter mu
static double calculateMu(int numNodes, double nodes[][2], double centroidX, double centroidY, int p, int q) {
    double mu = 0;

    for (double x = 0; x < maxX; x++) {
        for (double y = 0; y < maxY; y++) {
            mu += pow((x - centroidX), p) * pow((y - centroidY), q) * calculateI(numNodes, nodes, x, y);
        }
    }

    return mu;
}

// Greek letter eta
static double calculateEta(int numNodes, double nodes[][2], double centroidX, double centroidY, double muDenominator, int p, int q) {
    double denominator = pow(muDenominator, (1 + (p + q) / 2));
    double numerator = calculateMu(numNodes, nodes, centroidX, centroidY, p, q);
    return (numerator / denominator);
}

/***************
 Function to calculate Hu Moments based on explanation found here:
 https://towardsdatascience.com/introduction-to-the-invariant-moment-and-its-application-to-the-feature-extraction-ee991f39ec
 Liberties were taken to optimize the algorithm for C
***************/
static int l_calculateHuMoments(lua_State *L) {
    if (!lua_isnumber(L, 1) || !lua_istable(L, 2)) {
        printf("Incorrect arguments provided.\n");
        return 0;
    }

    int count = lua_tonumber(L, 1);
    double nodes[count][2];

    lua_pushnil(L);
    while (lua_next(L, -2)) {
        lua_pushvalue(L, -2);
        const char *key = lua_tostring(L, -1);
        lua_getfield(L, -2, "x");
        lua_getfield(L, -3, "y");
        const char *x = lua_tostring(L, -2);
        const char *y = lua_tostring(L, -1);
        lua_pop(L, 4);

        char *temp1, *temp2, *temp3;
        int index = strtol(key, &temp1, 10);
        nodes[index][0] = strtod(x, &temp2);
        nodes[index][1] = strtod(y, &temp3);
    }

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

    double xRatio = maxX / xRange;
    double yRatio = maxY / yRange;
    double scale = min(xRatio, yRatio);

    for(int i = 0; i < count; i++) {
        nodes[i][0] -= minCoords[0];
        nodes[i][1] -= minCoords[1];

        nodes[i][0] *= scale;
        nodes[i][1] *= scale;

        // printf("%13.7f %12.7f", nodes[i][0], nodes[i][1]);
        // printf("\n");
    }

    double h1 = 0, h2 = 0, h3 = 0, h4 = 0, h5 = 0, h6 = 0, h7 = 0;
    double mDenominator = calculateM(count, nodes, 0, 0);

    if (mDenominator != 0) { // mDenominator = 0 if and only if grid is completely empty
        double centroidX = 0, centroidY = 0;
        centroidX = (double) calculateM(count, nodes, 1, 0) / mDenominator;
        centroidY = (double) calculateM(count, nodes, 0, 1) / mDenominator;

        double muDenominator = calculateMu(count, nodes, centroidX, centroidY, 0, 0);

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

    // printf("%f\n", h1);
    // printf("%f\n", h2);
    // printf("%f\n", h3);
    // printf("%f\n", h4);
    // printf("%f\n", h5);
    // printf("%f\n", h6);
    // printf("%f\n", h7);

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
    return 0;
}