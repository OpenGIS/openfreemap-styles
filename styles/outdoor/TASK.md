currently, like pbf contours, there are two outdoor POI sources: trailsplits and local. currently the const names include TRAILSPLITS even when local is used. I want to restructure the outdoor pois section and accompanying const definitions so that it is more logial, named appropriately and well commented. I chould be able to enable outdoor pois and switch sources with consts @scripts/build.mjs MIN/MAX ZOOMS should be set to handle trailsplits/localhost seperately to make the most out of the data sources.

both the trailsplits contour pbfs and pois remote/local sections should consistent so the file as a whole is coherent.

Remember, the build script is structured to read through the different layers in the order that they are rendered/stacked.