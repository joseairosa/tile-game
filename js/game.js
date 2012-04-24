// Created by: José P. Airosa for facebook code test #1
// Email: me@joseairosa.com

// Our abstracted scope
(function () {

    // Make sure we don't load our game environment more than once
    if (window.TG) return;

    // Initialize our Tile Game (TG) main object
    window.TG = {};

    // Tile matrix. We initialize it empty to make the size of the matrix dynamic
    var tm = [];
    // Storing all original indexes for faster position retrieval
    var tm_position_cache = [];
    // Number of tiles on both axis
    var tm_size = {x:4, y:4};
    // Initialize container for tile sizes that will be calculated on TG.init
    var tile_size = {w:0, h:0};
    // Size of the background image
    var image_size = {w:540, h:540};
    // Drag flag
    var is_being_dragged = false;
    // Gameboard css selector (noramlly its ID)
    var gb_selector = "";

    var move_instructions = {};

    TG.init = function (e) {

        gb_selector = "#" + e;

        // Calculate the width and height based on the image width and height and number of tiles on the x and y axis
        tile_size.w = (image_size.w / tm_size.x);
        tile_size.h = (image_size.h / tm_size.y);

        TG.fillMatrix();
        TG.renderBoard(e);
        TG.shuffleTiles();
    };

    TG.iterate = function (fn) {
        var index = 0;
        for (var ii = 0; ii < tm_size.y; ii++) {
            for (var jj = 0; jj < tm_size.x; jj++) {
                fn(index, jj, ii);
                index++;
            }
        }
    };

    TG.fillMatrix = function () {
        TG.iterate(function (index, x, y) {
            tm_position_cache.push({x:(x * tile_size.w), y:(y * tile_size.h)});
            tm.push(index);
        });
    };

    // Used the Fisher-Yates randomizing shuffle algorithm
    TG.shuffleTiles = function () {
        var i = tm.length;
        if (i == 0) return false;
        while (--i) {
            var j = Math.floor(Math.random() * ( i + 1 ));
            var tempi = tm[i];
            var tempj = tm[j];
            tm[i] = tempj;
            tm[j] = tempi;
        }

        // Apply the shuffled board and set the tiles
        for (var ii = 0; ii < tm.length; ii++) {
            axis = TG.getPositionReference(tm.indexOf(ii));
            $('div[tile="' + ii + '"]').css({
                left:axis.x,
                top:axis.y
            });
        }
    };

    TG.renderBoard = function () {

        // Hide our board while we add the tiles and apply the pre-processed shuffle
        $(gb_selector).css("display", "none").width(image_size.w).height(image_size.y);

        // Render
        TG.iterate(function (index, x, y) {
            var new_tile = $("<div></div>")
                .attr({tile:index})
                .width(tile_size.w)
                .height(tile_size.h);
            $(gb_selector).append(new_tile);
            // Make sure we don't fill the last tile as it will be our freespace
            if (index != (tm_size.x * tm_size.y) - 1) {
                var background_position = (x == 0 && y == 0 ? "0px 0px" : "-" + (tile_size.h * y) + "px -" + (tile_size.w * x) + "px");
                new_tile.css({
                    backgroundPosition:background_position,
                    left:(x * tile_size.w) + "px",
                    top:(y * tile_size.h) + "px"
                }).addClass("tiles tile");
            } else {
                // Add our whitespace
                new_tile.css({
                    left:((tm_size.x - 1) * tile_size.w) + "px",
                    top:((tm_size.y - 1) * tile_size.h) + "px"
                }).addClass("no-tile");
            }
        });

        var moved_on_x = 0;
        var moved_on_y = 0;

        // Add callbacks to each of the tiles
        $(".tiles")
            .mousedown(function (md_e) {

                moved_on_x = 0;
                moved_on_y = 0;

                is_being_dragged = true;

                move_instructions = TG.getMoveInstructions($(this).attr("tile"));

                if (move_instructions != false) {
                    // Bind a mousemove event onto our gameboard to get access to the mouse coordinates inside it
                    $(gb_selector).bind('mousemove.move_tile', function (mm_e) {

                        TG.executeMove(function (index, instruction) {
                            // Get the position to where this tile needs to move to
                            var initial_position = TG.getPositionReference(instruction.i);

                            // Calculate the movement of the tiles
                            moved_on_x = (mm_e.pageX - md_e.pageX);
                            moved_on_y = (mm_e.pageY - md_e.pageY);

                            var p = {
                                x:instruction.a == "y" ? initial_position.x : initial_position.x + (moved_on_x),
                                y:instruction.a == "x" ? initial_position.y : initial_position.y + (moved_on_y)
                            };

                            // Make sure the user is not able to move the tile in the wrong direction and more than he
                            // is able to, normally, more than one gap
                            if (instruction.a == "x" && instruction.d < 0 && p.x > initial_position.x) p.x = initial_position.x;
                            else if (instruction.a == "x" && instruction.d > 0 && p.x < initial_position.x) p.x = initial_position.x;
                            else if (instruction.a == "x" && instruction.d < 0 && Math.abs(moved_on_x) > tile_size.w) p.x = initial_position.x-tile_size.w;
                            else if (instruction.a == "x" && instruction.d > 0 && Math.abs(moved_on_x) > tile_size.w) p.x = initial_position.x+tile_size.w;

                            if (instruction.a == "y" && instruction.d < 0 && p.y > initial_position.y) p.y = initial_position.y;
                            else if (instruction.a == "y" && instruction.d > 0 && p.y < initial_position.y) p.y = initial_position.y;
                            else if (instruction.a == "y" && instruction.d < 0 && Math.abs(moved_on_y) > tile_size.h) p.y = initial_position.y-tile_size.h;
                            else if (instruction.a == "y" && instruction.d > 0 && Math.abs(moved_on_y) > tile_size.h) p.y = initial_position.y+tile_size.h;


                            // Make sure the user is not able to move the tile outside gameboard limits
                            if (p.x >= image_size.w - tile_size.w) p.x = image_size.w - tile_size.w;
                            if (p.y >= image_size.h - tile_size.h) p.y = image_size.h - tile_size.h;
                            if (p.x <= 0) p.x = 0;
                            if (p.y <= 0) p.y = 0;

                            // Animate the tile to its new position
                            $('div[tile="' + tm[instruction.i] + '"]').css({
                                top:p.y,
                                left:p.x
                            });
                        });

                    });
                }
            })
            .mouseup(function (mu_e) {
                if (move_instructions != false) {
                    TG.executeMove(function (index, instruction) {
                        if((instruction.a == "x" && Math.abs(moved_on_x) < (tile_size.w/2) && Math.abs(moved_on_x) > 0) || (instruction.a == "y" && Math.abs(moved_on_y) < (tile_size.h/2) && Math.abs(moved_on_y) > 0)) {
                            // Get tile inital position
                            var initial_position = TG.getPositionReference(instruction.i);
                            // Animate the tile to its initial position
                            $('div[tile="' + tm[instruction.i] + '"]').animate({
                                top:initial_position.y,
                                left:initial_position.x
                            }, 100);
                        } else {
                            // Get the position to where this tile needs to move to
                            var move_to = TG.getPositionReference(instruction.to_i);
                            // Animate the tile to its new position
                            $('div[tile="' + tm[instruction.i] + '"]').animate({
                                top:move_to.y,
                                left:move_to.x
                            }, 100);
                            // Swap indexes on the tile matrix
                            var tmp = tm[instruction.to_i];
                            tm[instruction.to_i] = tm[instruction.i];
                            tm[instruction.i] = tmp;
                        }
                    });
                    // Unbind the mousemove event as we don't need it anymore. It's always a good idea to clean the house
                    // after the party!
                    $(gb_selector).unbind('mousemove.move_tile');
                }
                is_being_dragged = false;
            });

        // Show our board again
        $(gb_selector).css("display", "block");
    };

    // For a given index get the tile position
    //
    // @param index
    //
    // @return
    TG.getPositionReference = function (index) {
        return tm_position_cache[index];
    };

    // Return the index of the tile from its current axis
    TG.getIndexReferenceByAxis = function (x, y) {
        return y * tm_size.x + x;
    };

    TG.getBlankSpot = function () {
        return TG.getPositionReference(tm.indexOf(tm.length - 1));
    };

    TG.getTileReferenceFromX = function (axis) {
        return (parseInt(axis) / parseInt(tile_size.w));
    };

    TG.get_tile_reference_from_y = function (axis) {
        return (parseInt(axis) / parseInt(tile_size.h));
    };

    TG.executeMove = function (fn) {
        if (move_instructions != false) {
            for (var key in move_instructions) {
                fn(key, move_instructions[key]);
            }
        }
    };

    TG.getMoveInstructions = function (i) {

        var index = tm.indexOf(parseInt(i));
        clicked_ref = TG.getPositionReference(index);
        blank_ref = TG.getBlankSpot();

        is_x_move = !!(clicked_ref.y == blank_ref.y);
        is_y_move = !!(clicked_ref.x == blank_ref.x);

        // Check if this is an illigal move
        // If illigal we should return false
        if ((!is_x_move && !is_y_move) || (is_x_move && is_y_move)) {
            return false;
        }

        move_to_right = !!(clicked_ref.x - blank_ref.x < 0);
        move_to_bottom = !!(clicked_ref.y - blank_ref.y < 0);

        var clicked_ref_x = TG.get_tile_reference_from_y(clicked_ref.x);
        var clicked_ref_y = TG.get_tile_reference_from_y(clicked_ref.y);
        var blank_ref_x = TG.get_tile_reference_from_y(blank_ref.x);
        var blank_ref_y = TG.get_tile_reference_from_y(blank_ref.y);

        // Check if this is a x axis move
        tmp_array_move = [];
        if (is_x_move) {
            if (move_to_right) {
                for (var ii = clicked_ref_x; ii < blank_ref_x; ii++) {
                    tmp_array_move.push({
                        a:"x",
                        d:1,
                        i:TG.getIndexReferenceByAxis(ii, clicked_ref_y),
                        to_i:TG.getIndexReferenceByAxis(ii + 1, clicked_ref_y),
                        x:ii,
                        y:clicked_ref_y,
                        to_x:ii + 1,
                        to_y:clicked_ref_y
                    });
                }
            } else {
                for (var ii = TG.getTileReferenceFromX(clicked_ref.x); ii > TG.getTileReferenceFromX(blank_ref.x); ii--) {
                    tmp_array_move.push({
                        a:"x",
                        d:-1,
                        i:TG.getIndexReferenceByAxis(ii, clicked_ref_y),
                        to_i:TG.getIndexReferenceByAxis(ii - 1, clicked_ref_y),
                        x:ii,
                        y:clicked_ref_y,
                        to_x:ii - 1,
                        to_y:clicked_ref_y
                    });
                }
            }
        }
        // Check if this is a y axis move
        else if (is_y_move) {
            if (move_to_bottom) {
                for (var ii = clicked_ref_y; ii < blank_ref_y; ii++) {
                    tmp_array_move.push({
                        a:"y",
                        d:1,
                        i:TG.getIndexReferenceByAxis(clicked_ref_x, ii),
                        to_i:TG.getIndexReferenceByAxis(clicked_ref_x, ii + 1),
                        x:clicked_ref_x,
                        y:ii,
                        to_x:clicked_ref_x,
                        to_y:ii + 1
                    });
                }
            } else {
                for (var ii = clicked_ref_y; ii > blank_ref_y; ii--) {
                    tmp_array_move.push({
                        a:"y",
                        d:-1,
                        i:TG.getIndexReferenceByAxis(clicked_ref_x, ii),
                        to_i:TG.getIndexReferenceByAxis(clicked_ref_x, ii - 1),
                        x:clicked_ref_x,
                        y:ii,
                        to_x:clicked_ref_x,
                        to_y:ii - 1
                    });
                }
            }
        } else {
            return false
        }

        return tmp_array_move.reverse();
    };

})();