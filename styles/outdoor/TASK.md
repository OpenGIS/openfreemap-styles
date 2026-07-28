@scripts/build.mjs

I want to make the contours setup customisable through CONSTS and well explained in comments. Currently the pbf and plugin implementations have been conflated, so neither works very well.

To achieve this, I want to update the build script so tha the two contour implementations are seperated, and selected using a single boolean.

The current state is that the plugin implentation just about works (the wiring is right, but the contours do not look good and contour labels do not display frequently enough). 

To fix this, the build script should:

1/ seperate out the implementations, in the code, so they stand apart
2/ use the example setups in order to ground each implementation in configuration/styles that we know work well for each https://github.com/onthegomap/maplibre-contour (using mapterhorn) and https://trailsplits.com/api#contours
3/ Each should have seperate, well named CONSTs that explain their meaning. Remember, the build script walks through each component in the order that it is added to the map. I want you to review all of the contour based consts so that they are well-named and consistent. 

Pay particular attention to how the min/max zoom constants are defined for each. Set the initial consts for so that contour lines are displayed as high as possible for each, including overzoom. I want to make sure that if contour data is available, it is rendered.

I also want support for metric/imperial contour labels. I know this is documented for the plugin, so would be a simple change to @scripts/contours.js I am not sure how this is achieved through pbf.
