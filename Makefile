shapeComparison.o : shapeComparison.c
	cc -shared -fPIC -I/usr/include/lua5.3 -llua5.3 -o shapeComparison.so shapeComparison.c
