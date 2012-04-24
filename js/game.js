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

    TG.init = function (e) {

        // Calculate the width and height based on the image width and height and number of tiles on the x and y axis
        tile_size.w = (image_size.w / tm_size.x);
        tile_size.h = (image_size.h / tm_size.y);

        TG.fill_matrix();
        TG.render_board(e);
        TG.shuffle_tiles();
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

    TG.fill_matrix = function () {
        TG.iterate(function (index, x, y) {
            tm_position_cache.push({x:(x * tile_size.w), y:(y * tile_size.h)});
            tm.push(index);
        });
    };

    // Used the Fisher-Yates randomizing shuffle algorithm
    TG.shuffle_tiles = function () {
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
            axis = TG.get_position_reference(tm.indexOf(ii));
            $('div[tile="' + ii + '"]').css({
                left:axis.x,
                top:axis.y
            });
        }
    };

    TG.render_board = function (e) {

        // Hide our board while we add the tiles and apply the pre-processed shuffle
        $("#" + e).css("display", "none").width(image_size.w).height(image_size.y);

        // Render
        TG.iterate(function (index, x, y) {
            var new_tile = $("<div></div>")
                .attr({tile:index})
                .width(tile_size.w)
                .height(tile_size.h);
            $("#" + e).append(new_tile);
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

        // Add callbacks to each of the tiles
        $(".tiles").click(function () {
            TG.make_move($(this));
        });

        // Show our board again
        $("#" + e).css("display", "block");
    };

    // For a given index get the tile position
    //
    // @param index
    //
    // @return
    TG.get_position_reference = function (index) {
        return tm_position_cache[index];
    };

    // Return the index of the tile from its current axis
    TG.get_index_reference_by_axis = function (x, y) {
        return y * tm_size.x + x;
    };

    TG.get_blank_spot = function () {
        return TG.get_position_reference(tm.indexOf(tm.length - 1));
    };

    TG.get_tile_reference_from_x = function (axis) {
        return (parseInt(axis) / parseInt(tile_size.w));
    };

    TG.get_tile_reference_from_y = function (axis) {
        return (parseInt(axis) / parseInt(tile_size.h));
    };

    TG.make_move = function (co) {
        var instructions = TG.get_move_instructions(co.attr("tile"));
        console.log(instructions);
        if (instructions != false) {
            console.log(tm);
            for (var key in instructions) {
                var instruction = instructions[key];
                // Get the position to where this tile needs to move to
                var move_to = TG.get_position_reference(instruction.to_i);
                console.log("new_index->" + instruction.to_i);
                console.log(move_to);
                console.log("instruction.i->" + instruction.i);
                console.log("tile->" + tm[instruction.i]);
                // Animate the tile to its new position
                $('div[tile="' + tm[instruction.i] + '"]').animate({
                    top:move_to.y,
                    left:move_to.x
                }, 150);
                // Swap indexes on the tile matrix
                var tmp = tm[instruction.to_i];
                tm[instruction.to_i] = tm[instruction.i];
                tm[instruction.i] = tmp;
            }
            console.log(tm);
        }
    };

    TG.get_move_instructions = function (i) {

        var index = tm.indexOf(parseInt(i));
        clicked_ref = TG.get_position_reference(index);
        blank_ref = TG.get_blank_spot();

        is_x_move = !!(clicked_ref.y == blank_ref.y);
        is_y_move = !!(clicked_ref.x == blank_ref.x);

        // Check if this is an illigal move
        // If illigal we should return false
        if ((!is_x_move && !is_y_move) || (is_x_move && is_y_move)) {
            return false;
        }

        move_to_right = !!(clicked_ref.x - blank_ref.x < 0);
        move_to_bottom = !!(clicked_ref.y - blank_ref.y < 0);

        console.log("is_x_move -> " + is_x_move);
        console.log("is_y_move -> " + is_y_move);
        console.log("move right -> " + move_to_right);
        console.log("move bottom -> " + move_to_bottom);

        console.log(TG.get_tile_reference_from_x(clicked_ref.x));
        console.log(TG.get_tile_reference_from_y(clicked_ref.y));
        console.log(TG.get_tile_reference_from_x(blank_ref.x));
        console.log(TG.get_tile_reference_from_y(blank_ref.y));

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
                        d:1,
                        i:TG.get_index_reference_by_axis(ii, clicked_ref_y),
                        to_i:TG.get_index_reference_by_axis(ii + 1, clicked_ref_y),
                        x:ii,
                        y:clicked_ref_y,
                        to_x:ii + 1,
                        to_y:clicked_ref_y
                    });
                }
            } else {
                for (var ii = TG.get_tile_reference_from_x(clicked_ref.x); ii > TG.get_tile_reference_from_x(blank_ref.x); ii--) {
                    tmp_array_move.push({
                        d:-1,
                        i:TG.get_index_reference_by_axis(ii, clicked_ref_y),
                        to_i:TG.get_index_reference_by_axis(ii - 1, clicked_ref_y),
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
                        d:1,
                        i:TG.get_index_reference_by_axis(clicked_ref_x, ii),
                        to_i:TG.get_index_reference_by_axis(clicked_ref_x, ii + 1),
                        x:clicked_ref_x,
                        y:ii,
                        to_x:clicked_ref_x,
                        to_y:ii + 1
                    });
                }
            } else {
                for (var ii = clicked_ref_y; ii > blank_ref_y; ii--) {
                    tmp_array_move.push({
                        d:-1,
                        i:TG.get_index_reference_by_axis(clicked_ref_x, ii),
                        to_i:TG.get_index_reference_by_axis(clicked_ref_x, ii - 1),
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